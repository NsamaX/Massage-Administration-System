"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { EntryOptions, RecentEntry } from "./schema";

type EntryResult = { error: string | null; entries: RecentEntry[] };

function dbError(_err: unknown): string {
  return "เกิดข้อผิดพลาด กรุณาลองใหม่";
}

export async function getEntryOptions(): Promise<EntryOptions> {
  const [staffRows, massageRows, roomRows] = await Promise.all([
    db.query(
      "SELECT id, CONCAT(first_name, ' ', last_name) AS name FROM employees WHERE employment_status = 'employed' ORDER BY first_name"
    ),
    db.query(
      `SELECT m.id, m.name, m.duration_min,
              GROUP_CONCAT(md.duration_min ORDER BY md.duration_min SEPARATOR ',') AS duration_options
       FROM massages m
       LEFT JOIN massage_durations md ON md.massage_id = m.id
       WHERE m.status = 'active'
       GROUP BY m.id, m.name, m.duration_min
       ORDER BY m.name`
    ),
    db.query("SELECT id, room_number FROM rooms ORDER BY room_number"),
  ]);

  return {
    staff: (staffRows[0] as any[]).map((r) => ({ id: r.id, label: r.name })),
    massages: (massageRows[0] as any[]).map((r) => {
      const durations: number[] = r.duration_options
        ? (r.duration_options as string).split(",").map(Number)
        : [Number(r.duration_min)];
      return {
        id: r.id,
        label: r.name as string,
        duration: Number(r.duration_min),
        durations,
      };
    }),
    rooms: (roomRows[0] as any[]).map((r) => ({
      id: r.id,
      label: `ห้อง ${r.room_number}`,
    })),
  };
}

async function fetchRecentEntries(): Promise<RecentEntry[]> {
  const [rows] = await db.query(
    `SELECT
       a.id,
       DATE_FORMAT(a.start_time, '%Y-%m-%d')         AS date,
       TIME_FORMAT(a.start_time, '%H:%i')            AS time,
       TIME_FORMAT(a.end_time, '%H:%i')              AS endTime,
       IF(HOUR(a.start_time) < 12, 'AM', 'PM')      AS meridiem,
       e.employee_code                               AS staffCode,
       CONCAT(e.first_name, ' ', e.last_name)        AS staffName,
       e.image_url                                   AS staffImageUrl,
       m.name                                        AS massageName,
       TIMESTAMPDIFF(MINUTE, a.start_time, a.end_time) AS durationMin,
       r.room_number                                 AS roomNumber,
       COALESCE(a.hourly_rate_snapshot, m.hourly_rate) AS hourlyRateSnapshot,
       ROUND(CEILING(TIMESTAMPDIFF(MINUTE, a.start_time, a.end_time) / 30) * 0.5 * COALESCE(a.hourly_rate_snapshot, m.hourly_rate), 2) AS computedSalary
     FROM appointments a
     JOIN employees e ON e.id = a.employee_id
     JOIN massages m ON m.id = a.massage_id
     LEFT JOIN rooms r ON r.id = a.room_id
     WHERE a.status = 'completed'
     ORDER BY a.created_at DESC
     LIMIT 30`
  );
  return (rows as any[]).map((r): RecentEntry => ({
    id: r.id,
    date: r.date,
    time: r.time,
    endTime: r.endTime,
    meridiem: r.meridiem,
    staffCode: r.staffCode ?? null,
    staffName: r.staffName,
    staffImageUrl: r.staffImageUrl ?? null,
    massageName: r.massageName,
    durationMin: Number(r.durationMin),
    roomLabel: r.roomNumber != null ? `ห้อง ${r.roomNumber}` : null,
    hourlyRateSnapshot: Number(r.hourlyRateSnapshot),
    computedSalary: Number(r.computedSalary),
  }));
}

export async function getRecentEntries(): Promise<RecentEntry[]> {
  return fetchRecentEntries();
}

export async function addManualEntry(
  employeeId: number,
  massageId: number,
  roomId: number | null,
  startTime: string | null,
  durationMin?: number
): Promise<EntryResult> {
  try {
    let duration: number;
    if (durationMin != null) {
      duration = durationMin;
    } else {
      const [massageRows] = await db.query(
        "SELECT duration_min FROM massages WHERE id = ?",
        [massageId]
      );
      duration = (massageRows as any[])[0]?.duration_min ?? 60;
    }

    if (startTime) {
      const mysqlDt = startTime.replace("T", " ") + ":00";
      await db.query(
        `INSERT INTO appointments (employee_id, massage_id, room_id, start_time, end_time, status)
         VALUES (?, ?, ?, ?, DATE_ADD(?, INTERVAL ? MINUTE), 'completed')`,
        [employeeId, massageId, roomId, mysqlDt, mysqlDt, duration]
      );
    } else {
      await db.query(
        `INSERT INTO appointments (employee_id, massage_id, room_id, start_time, end_time, status)
         VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE), 'completed')`,
        [employeeId, massageId, roomId, duration]
      );
    }

    revalidatePath("/entry");
    revalidatePath("/report");
    const entries = await fetchRecentEntries();
    return { error: null, entries };
  } catch (err) {
    return { error: dbError(err), entries: [] };
  }
}
