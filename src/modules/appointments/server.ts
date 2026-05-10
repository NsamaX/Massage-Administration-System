"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { MassageOption, RoomOption, StaffStatus } from "./schema";

type ActionResult = { error: string | null };

function dbError(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as any).code;
    if (code === "ER_DUP_ENTRY") return "ข้อมูลนี้มีอยู่แล้ว";
  }
  return "เกิดข้อผิดพลาด กรุณาลองใหม่";
}

export async function getStaffWithStatus(): Promise<StaffStatus[]> {
  const [rows] = await db.query(`
    SELECT
      e.id,
      CONCAT(e.first_name, ' ', e.last_name) AS name,
      e.phone AS phone,
      e.image_url AS imageUrl,
      GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ',') AS skills,
      COALESCE(a.status, 'absent') AS attendance,
      (SELECT COUNT(*) FROM appointments
       WHERE employee_id = e.id AND status = 'in_progress') AS working_count
    FROM employees e
    LEFT JOIN employee_skills es ON es.employee_id = e.id
    LEFT JOIN skills s           ON s.id = es.skill_id
    LEFT JOIN attendance a       ON a.employee_id = e.id AND a.date = CURDATE()
    WHERE e.employment_status = 'employed'
    GROUP BY e.id, a.status
    ORDER BY e.id
  `);

  const STATUS_ORDER: Record<StaffStatus["status"], number> = { available: 0, working: 1, absent: 2 };

  return (rows as any[])
    .map((row): StaffStatus => ({
      id: row.id,
      name: row.name,
      phone: row.phone ?? null,
      imageUrl: row.imageUrl ?? null,
      skills: row.skills ? row.skills.split(",") : [],
      status:
        row.attendance !== "present"
          ? "absent"
          : Number(row.working_count) > 0
          ? "working"
          : "available",
    }))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

export async function getMassagesForAssign(): Promise<MassageOption[]> {
  const [rows] = await db.query(
    "SELECT id, name, duration_min FROM massages WHERE status = 'active' ORDER BY name"
  );
  return (rows as any[]).map((r) => ({
    id: r.id,
    label: `${r.name} ${r.duration_min} นาที`,
  }));
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
  return (rows as any[]).map((r) => ({
    id: r.id,
    label: `ห้อง ${r.room_number}`,
  }));
}

export async function assignAppointment(
  staffId: number,
  massageId: number,
  roomId: number | null
): Promise<ActionResult> {
  try {
    const [massageRows] = await db.query(
      "SELECT duration_min, hourly_rate FROM massages WHERE id = ?",
      [massageId]
    );
    const duration = (massageRows as any[])[0]?.duration_min ?? 60;
    const hourlyRate = (massageRows as any[])[0]?.hourly_rate ?? 0;

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

export async function completeAppointment(staffId: number): Promise<ActionResult> {
  try {
    await db.query(
      "UPDATE appointments SET status = 'completed' WHERE employee_id = ? AND status = 'in_progress'",
      [staffId]
    );
    revalidatePath("/appointments");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}
