"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { DashboardStats, HistoryEntry, RoomState } from "./schema";

type ActionResult = { error: string | null };

function dbError(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as any).code;
    if (code === "ER_DUP_ENTRY") return "ห้องนี้มีอยู่แล้ว";
  }
  return "เกิดข้อผิดพลาด กรุณาลองใหม่";
}

const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  waiting:     "รอดำเนินการ",
  in_progress: "กำลังให้บริการ",
  completed:   "เสร็จสิ้น",
  cancelled:   "ยกเลิก",
};

function mapHistoryRows(rows: any[]): HistoryEntry[] {
  return rows.map((r): HistoryEntry => ({
    date:         r.date,
    time:         r.time,
    endTime:      r.endTime ?? null,
    meridiem:     r.meridiem,
    staffName:    r.staffName,
    staffImageUrl: r.staffImageUrl ?? null,
    serviceName:  r.serviceName,
    roomLabel:    r.roomNumber != null ? `ห้อง ${r.roomNumber}` : null,
    statusLabel:  APPOINTMENT_STATUS_LABEL[r.status] ?? r.status,
  }));
}

const HISTORY_SELECT = `
  SELECT
    DATE_FORMAT(a.start_time, '%Y-%m-%d')         AS date,
    TIME_FORMAT(a.start_time, '%H:%i')            AS time,
    IF(a.status = 'completed', TIME_FORMAT(a.end_time, '%H:%i'), NULL) AS endTime,
    IF(HOUR(a.start_time) < 12, 'AM', 'PM')      AS meridiem,
    CONCAT(e.first_name, ' ', e.last_name)        AS staffName,
    e.image_url                                   AS staffImageUrl,
    CONCAT(m.name, ' ', m.duration_min, ' นาที') AS serviceName,
    r.room_number                                 AS roomNumber,
    a.status
  FROM appointments a
  JOIN employees e  ON e.id = a.employee_id
  JOIN massages m   ON m.id = a.massage_id
  LEFT JOIN rooms r ON r.id = a.room_id
`;

export async function getDashboardData(): Promise<{
  stats: DashboardStats;
  rooms: RoomState[];
  history: HistoryEntry[];
  activeDates: string[];
}> {
  const [statsRows, roomRows, historyRows, dateRows] = await Promise.all([
    db.query(`
      SELECT
        (SELECT COUNT(*) FROM employees WHERE employment_status = 'employed') AS total_staff,
        (SELECT COUNT(*)
         FROM employees e
         WHERE e.employment_status = 'employed'
           AND e.id NOT IN (
             SELECT employee_id FROM appointments
             WHERE status = 'in_progress' AND employee_id IS NOT NULL
           )
        ) AS available_staff,
        (SELECT COUNT(*) FROM rooms) AS total_rooms,
        (SELECT COUNT(*) FROM appointments WHERE status = 'in_progress' AND room_id IS NOT NULL) AS occupied_rooms,
        (SELECT COUNT(*) FROM appointments WHERE DATE(start_time) = CURDATE() AND status != 'cancelled') AS today_customers,
        (SELECT COALESCE(SUM(m.price), 0)
         FROM appointments a JOIN massages m ON m.id = a.massage_id
         WHERE DATE(a.start_time) = CURDATE() AND a.status = 'completed'
        ) AS today_revenue
    `),
    db.query(`
      SELECT
        r.id,
        r.room_number                                         AS \`number\`,
        CONCAT(e.first_name, ' ', e.last_name)               AS staffName,
        e.image_url                                          AS staffImageUrl,
        CONCAT(m.name, ' ', m.duration_min, ' นาที')         AS serviceName,
        TIME_FORMAT(a.start_time, '%H:%i')                   AS startTime
      FROM rooms r
      LEFT JOIN appointments a ON a.room_id = r.id AND a.status = 'in_progress'
      LEFT JOIN employees e    ON e.id = a.employee_id
      LEFT JOIN massages m     ON m.id = a.massage_id
      ORDER BY r.room_number
    `),
    db.query(`${HISTORY_SELECT} WHERE DATE(a.start_time) = CURDATE() ORDER BY a.start_time DESC`),
    db.query(
      `SELECT DISTINCT DATE_FORMAT(start_time, '%Y-%m-%d') AS date
       FROM appointments
       WHERE status != 'cancelled' AND employee_id IS NOT NULL`
    ),
  ]);

  const raw = (statsRows[0] as any[])[0];
  const stats: DashboardStats = {
    totalStaff:     Number(raw.total_staff),
    availableStaff: Number(raw.available_staff),
    totalRooms:     Number(raw.total_rooms),
    occupiedRooms:  Number(raw.occupied_rooms),
    todayCustomers: Number(raw.today_customers),
    todayRevenue:   Number(raw.today_revenue),
  };

  const roomMap = new Map<number, RoomState>();
  for (const r of roomRows[0] as any[]) {
    if (!roomMap.has(r.id)) {
      roomMap.set(r.id, {
        id:           r.id,
        number:       r.number,
        staffNames:   r.staffName ? [r.staffName] : [],
        staffImageUrl: r.staffImageUrl ?? null,
        serviceName:  r.serviceName ?? null,
        startTime:    r.startTime ?? null,
      });
    } else if (r.staffName) {
      roomMap.get(r.id)!.staffNames.push(r.staffName);
    }
  }
  const rooms = Array.from(roomMap.values());

  const history = mapHistoryRows(historyRows[0] as any[]);
  const activeDates = (dateRows[0] as any[]).map((r) => r.date as string);

  return { stats, rooms, history, activeDates };
}

export async function getHistoryByDate(date: string): Promise<HistoryEntry[]> {
  const [rows] = await db.query(
    `${HISTORY_SELECT} WHERE DATE(a.start_time) = ? ORDER BY a.start_time DESC`,
    [date]
  );
  return mapHistoryRows(rows as any[]);
}

export async function addRoom(): Promise<ActionResult> {
  try {
    const [rows] = await db.query("SELECT room_number FROM rooms ORDER BY room_number");
    const existing = (rows as any[]).map((r) => r.room_number);
    let next = 1;
    while (existing.includes(next)) next++;
    await db.query("INSERT INTO rooms (room_number) VALUES (?)", [next]);
    revalidatePath("/dashboard");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}

export async function deleteRoom(id: number): Promise<ActionResult> {
  try {
    await db.query("DELETE FROM rooms WHERE id = ?", [id]);
    revalidatePath("/dashboard");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}

export async function updateRoomNumber(id: number, number: number): Promise<ActionResult> {
  if (!Number.isInteger(number) || number < 1) return { error: "เลขห้องต้องมากกว่า 0" };
  try {
    await db.query("UPDATE rooms SET room_number = ? WHERE id = ?", [number, id]);
    revalidatePath("/dashboard");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}
