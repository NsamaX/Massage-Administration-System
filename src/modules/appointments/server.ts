"use server";

import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";
import { revalidatePath } from "next/cache";
import type { MassageOption, RoomOption, StaffStatus } from "./schema";

type ActionResult = { error: string | null };

type StaffStatusRow = RowDataPacket & {
  id: number;
  name: string;
  employeeCode: string | null;
  imageUrl: string | null;
  skills: string | null;
  attendance: string | null;
  working_count: number | string;
  working_room_number: number | string | null;
};

type MassageRow = RowDataPacket & {
  id: number;
  name: string;
  duration_min: number;
  hourly_rate: number | string | null;
};

type RoomRow = RowDataPacket & {
  id: number;
  room_number: number;
};

type CountRow = RowDataPacket & { c: number | string };
type RoomIdRow = RowDataPacket & { room_id: number | null };

function dbError(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as { code?: unknown }).code;
    if (code === "ER_DUP_ENTRY") return "ข้อมูลนี้มีอยู่แล้ว";
  }
  return "เกิดข้อผิดพลาด กรุณาลองใหม่";
}

export async function getStaffWithStatus(): Promise<StaffStatus[]> {
  const [rows] = await db.query(`
    SELECT
      e.id,
      CONCAT(e.first_name, ' ', e.last_name) AS name,
      e.employee_code AS employeeCode,
      e.image_url AS imageUrl,
      GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ',') AS skills,
      COALESCE(a.status, 'absent') AS attendance,
      (SELECT COUNT(*) FROM appointments
       WHERE employee_id = e.id AND status = 'in_progress') AS working_count
      ,
      (
        SELECT r.room_number
        FROM appointments ap
        LEFT JOIN rooms r ON r.id = ap.room_id
        WHERE ap.employee_id = e.id AND ap.status = 'in_progress'
        ORDER BY ap.start_time DESC
        LIMIT 1
      ) AS working_room_number
    FROM employees e
    LEFT JOIN employee_skills es ON es.employee_id = e.id
    LEFT JOIN skills s           ON s.id = es.skill_id
    LEFT JOIN attendance a       ON a.employee_id = e.id AND a.date = CURDATE()
    WHERE e.employment_status = 'employed'
    GROUP BY e.id, a.status
    ORDER BY e.id
  `);

  const STATUS_ORDER: Record<StaffStatus["status"], number> = { available: 0, working: 1, absent: 2 };

  return (rows as StaffStatusRow[])
    .map((row): StaffStatus => ({
      id: row.id,
      name: row.name,
      employeeCode: row.employeeCode ?? null,
      imageUrl: row.imageUrl ?? null,
      skills: row.skills ? row.skills.split(",") : [],
      status:
        row.attendance !== "present"
          ? "absent"
          : Number(row.working_count) > 0
          ? "working"
          : "available",
      workingRoomNumber: row.working_room_number !== null ? Number(row.working_room_number) : null,
    }))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

export async function getMassagesForAssign(): Promise<MassageOption[]> {
  const [rows] = await db.query(
    `SELECT m.id, m.name, m.duration_min,
            GROUP_CONCAT(md.duration_min ORDER BY md.duration_min SEPARATOR ',') AS duration_options
     FROM massages m
     LEFT JOIN massage_durations md ON md.massage_id = m.id
     WHERE m.status = 'active'
     GROUP BY m.id, m.name, m.duration_min
     ORDER BY m.name`
  );
  return (rows as (MassageRow & { duration_options: string | null })[]).map((r) => {
    const durations: number[] = r.duration_options
      ? r.duration_options.split(",").map(Number)
      : [r.duration_min];
    return {
      id: r.id,
      label: r.name,
      duration: r.duration_min,
      durations,
    };
  });
}

export async function getAvailableRooms(): Promise<RoomOption[]> {
  const [rows] = await db.query(`
    SELECT r.id, r.room_number
    FROM rooms r
    WHERE r.id NOT IN (
      SELECT room_id FROM appointments
      WHERE status = 'in_progress' AND room_id IS NOT NULL
    )
    ORDER BY r.room_number
  `);
  return (rows as RoomRow[]).map((r) => ({
    id: r.id,
    label: `ห้อง ${r.room_number}`,
  }));
}

export async function assignAppointment(
  staffId: number,
  massageId: number,
  roomId: number | null,
  durationMin?: number
): Promise<ActionResult> {
  try {
    if (!roomId) return { error: "กรุณาเลือกห้อง" };
    const [massageRows] = await db.query(
      "SELECT duration_min, hourly_rate FROM massages WHERE id = ?",
      [massageId]
    );
    const duration = durationMin ?? (massageRows as MassageRow[])[0]?.duration_min ?? 60;
    const hourlyRate = Number((massageRows as MassageRow[])[0]?.hourly_rate ?? 0);

    await db.query(
      `INSERT INTO appointments (employee_id, massage_id, room_id, start_time, end_time, status, hourly_rate_snapshot)
       VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE), 'in_progress', ?)`,
      [staffId, massageId, roomId, duration, hourlyRate]
    );

    revalidatePath("/appointments");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}

export async function assignAppointmentsGroup(
  staffIds: number[],
  massageId: number,
  roomId: number,
  durationMin?: number
): Promise<ActionResult> {
  if (staffIds.length === 0) return { error: "กรุณาเลือกพนักงาน" };
  if (!roomId) return { error: "กรุณาเลือกห้อง" };

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [roomBusyRows] = await conn.query(
      "SELECT COUNT(*) AS c FROM appointments WHERE status = 'in_progress' AND room_id = ?",
      [roomId]
    );
    const busyCount = Number((roomBusyRows as CountRow[])[0]?.c ?? 0);
    if (busyCount > 0) {
      await conn.rollback();
      return { error: "ห้องนี้กำลังถูกใช้งานอยู่" };
    }

    const [massageRows] = await conn.query(
      "SELECT duration_min, hourly_rate FROM massages WHERE id = ?",
      [massageId]
    );
    const duration = durationMin ?? (massageRows as MassageRow[])[0]?.duration_min ?? 60;
    const hourlyRate = Number((massageRows as MassageRow[])[0]?.hourly_rate ?? 0);

    const rowsSql = staffIds
      .map(() => "(?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE), 'in_progress', ?)")
      .join(", ");
    const params: Array<number> = [];
    for (const staffId of staffIds) {
      params.push(staffId, massageId, roomId, duration, hourlyRate);
    }
    await conn.query(
      `INSERT INTO appointments (employee_id, massage_id, room_id, start_time, end_time, status, hourly_rate_snapshot)
       VALUES ${rowsSql}`,
      params
    );

    await conn.commit();
    revalidatePath("/appointments");
    return { error: null };
  } catch (err) {
    try { await conn.rollback(); } catch {}
    return { error: dbError(err) };
  } finally {
    conn.release();
  }
}

export async function completeAppointment(staffId: number): Promise<ActionResult> {
  try {
    const [roomRows] = await db.query(
      "SELECT room_id FROM appointments WHERE employee_id = ? AND status = 'in_progress' ORDER BY start_time DESC LIMIT 1",
      [staffId]
    );
    const roomId = (roomRows as RoomIdRow[])[0]?.room_id ?? null;

    if (roomId) {
      await db.query(
        "UPDATE appointments SET status = 'completed', end_time = GREATEST(end_time, NOW()) WHERE room_id = ? AND status = 'in_progress'",
        [roomId]
      );
    } else {
      await db.query(
        "UPDATE appointments SET status = 'completed', end_time = GREATEST(end_time, NOW()) WHERE employee_id = ? AND status = 'in_progress'",
        [staffId]
      );
    }
    revalidatePath("/appointments");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}
