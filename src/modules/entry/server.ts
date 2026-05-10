"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { EntryOptions, RecentEntry } from "./schema";

type EntryResult = { error: string | null; entries: RecentEntry[] };

function dbError(_err: unknown): string {
  return "เกิดข้อผิดพลาด กรุณาลองใหม่";
}

function datetimeToLocal(val: Date | string): string {
  const d = val instanceof Date ? val : new Date(val);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day}T${h}:${mi}`;
}

export async function getEntryOptions(): Promise<EntryOptions> {
  const [staffRows, massageRows, roomRows] = await Promise.all([
    db.query(
      "SELECT id, CONCAT(first_name, ' ', last_name) AS name FROM employees WHERE employment_status = 'employed' ORDER BY first_name"
    ),
    db.query(
      "SELECT id, name, duration_min FROM massages WHERE status = 'active' ORDER BY name"
    ),
    db.query("SELECT id, room_number FROM rooms ORDER BY room_number"),
  ]);

  return {
    staff: (staffRows[0] as any[]).map((r) => ({ id: r.id, label: r.name })),
    massages: (massageRows[0] as any[]).map((r) => ({
      id: r.id,
      label: `${r.name} (${r.duration_min} นาที)`,
      duration: Number(r.duration_min),
    })),
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
       CONCAT(e.first_name, ' ', e.last_name) AS staffName,
       m.name AS massageName,
       m.duration_min AS durationMin,
       a.start_time AS startTime,
       r.room_number AS roomNumber
     FROM appointments a
     JOIN employees e ON e.id = a.employee_id
     JOIN massages m ON m.id = a.massage_id
     LEFT JOIN rooms r ON r.id = a.room_id
     WHERE a.status = 'completed'
     ORDER BY a.created_at DESC
     LIMIT 30`
  );
  return (rows as any[]).map((r) => ({
    id: r.id,
    staffName: r.staffName,
    massageName: r.massageName,
    durationMin: Number(r.durationMin),
    startTime: datetimeToLocal(r.startTime as Date | string),
    roomLabel: r.roomNumber != null ? `ห้อง ${r.roomNumber}` : null,
  }));
}

export async function getRecentEntries(): Promise<RecentEntry[]> {
  return fetchRecentEntries();
}

export async function addManualEntry(
  employeeId: number,
  massageId: number,
  roomId: number | null,
  startTime: string | null
): Promise<EntryResult> {
  try {
    const [massageRows] = await db.query(
      "SELECT duration_min FROM massages WHERE id = ?",
      [massageId]
    );
    const duration = (massageRows as any[])[0]?.duration_min ?? 60;

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
