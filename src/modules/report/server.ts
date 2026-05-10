"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { PayrollPeriod, ReportData, SalaryRow, StaffWorkEntry } from "./schema";

const MONTHS_SHORT_TH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function formatDateThai(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTHS_SHORT_TH[m - 1]} ${y + 543}`;
}

function getDaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export async function getReportData(startDate: string, endDate: string): Promise<ReportData> {
  const [countRows, serviceRows, salaryRows] = await Promise.all([
    db.query(
      `SELECT DATE_FORMAT(start_time, '%Y-%m-%d') AS date, COUNT(*) AS cnt
       FROM appointments
       WHERE DATE(start_time) BETWEEN ? AND ? AND status != 'cancelled'
       GROUP BY DATE(start_time)`,
      [startDate, endDate]
    ),
    db.query(
      `SELECT m.name, COUNT(*) AS cnt
       FROM appointments a
       JOIN massages m ON m.id = a.massage_id
       WHERE DATE(a.start_time) BETWEEN ? AND ? AND a.status != 'cancelled'
       GROUP BY m.name
       ORDER BY cnt DESC`,
      [startDate, endDate]
    ),
    db.query(
      `SELECT
         e.id,
         e.first_name AS firstName,
         e.last_name  AS lastName,
         ROUND(COALESCE(SUM(TIMESTAMPDIFF(MINUTE, a.start_time, a.end_time)), 0) / 60, 1) AS hours,
         ROUND(COALESCE(SUM(TIMESTAMPDIFF(MINUTE, a.start_time, a.end_time) / 60 * COALESCE(a.hourly_rate_snapshot, m.hourly_rate)), 0), 0) AS salary
       FROM employees e
       LEFT JOIN appointments a ON a.employee_id = e.id
         AND DATE(a.start_time) BETWEEN ? AND ?
         AND a.status = 'completed'
       LEFT JOIN massages m ON m.id = a.massage_id
       WHERE e.employment_status = 'employed'
       GROUP BY e.id
       HAVING hours > 0
       ORDER BY e.id`,
      [startDate, endDate]
    ),
  ]);

  // Bar chart: fill zeros for days with no appointments
  const countMap = new Map(
    (countRows[0] as any[]).map((r) => [r.date as string, Number(r.cnt)])
  );
  const days = getDaysInRange(startDate, endDate);
  const dailyCounts = days.map((d) => countMap.get(d) ?? 0);

  // Service popularity %
  const svcRows = serviceRows[0] as any[];
  const totalSvc = svcRows.reduce((s, r) => s + Number(r.cnt), 0);
  const top4 = svcRows.slice(0, 4);
  const otherCnt = svcRows.slice(4).reduce((s, r) => s + Number(r.cnt), 0);
  const servicePopularity = [
    ...top4.map((r) => ({
      name: r.name as string,
      percent: totalSvc ? Math.round((Number(r.cnt) / totalSvc) * 100) : 0,
    })),
    ...(otherCnt > 0
      ? [{ name: "อื่นๆ", percent: totalSvc ? Math.round((otherCnt / totalSvc) * 100) : 0 }]
      : []),
  ];

  const salary = (salaryRows[0] as any[]).map((r): SalaryRow => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    hours: Number(r.hours),
    salary: Number(r.salary),
  }));

  return { dailyCounts, servicePopularity, salaryRows: salary };
}

export async function createPayroll(startDate: string, endDate: string) {
  const [existing] = await db.query(
    "SELECT id FROM payroll WHERE period_start = ? AND period_end = ? LIMIT 1",
    [startDate, endDate]
  );
  if ((existing as any[]).length > 0) return;

  const [rows] = await db.query(
    `SELECT e.id,
       ROUND(COALESCE(SUM(TIMESTAMPDIFF(MINUTE, a.start_time, a.end_time)), 0) / 60, 1) AS hours,
       ROUND(COALESCE(SUM(TIMESTAMPDIFF(MINUTE, a.start_time, a.end_time) / 60 * COALESCE(a.hourly_rate_snapshot, m.hourly_rate)), 0), 0) AS salary
     FROM employees e
     LEFT JOIN appointments a ON a.employee_id = e.id
       AND DATE(a.start_time) BETWEEN ? AND ?
       AND a.status = 'completed'
     LEFT JOIN massages m ON m.id = a.massage_id
     WHERE e.employment_status = 'employed'
     GROUP BY e.id
     HAVING hours > 0`,
    [startDate, endDate]
  );

  if ((rows as any[]).length === 0) return;

  const values = (rows as any[]).map((r) => [r.id, startDate, endDate, r.hours, r.salary]);
  await db.query(
    "INSERT INTO payroll (employee_id, period_start, period_end, total_hours, total_amount) VALUES ?",
    [values]
  );

  revalidatePath("/report");
}

export async function getStaffWorkHistory(
  employeeId: number,
  startDate: string,
  endDate: string,
): Promise<StaffWorkEntry[]> {
  const [rows] = await db.query(
    `SELECT
       DATE_FORMAT(a.start_time, '%Y-%m-%d')         AS date,
       TIME_FORMAT(a.start_time, '%H:%i')            AS time,
       IF(HOUR(a.start_time) < 12, 'AM', 'PM')      AS meridiem,
       CONCAT(e.first_name, ' ', e.last_name)        AS staffName,
       e.image_url                                   AS staffImageUrl,
       CONCAT(m.name, ' ', m.duration_min, ' นาที') AS serviceName,
       r.room_number                                 AS roomNumber,
       COALESCE(a.hourly_rate_snapshot, m.hourly_rate) AS hourlyRateSnapshot
     FROM appointments a
     JOIN employees e  ON e.id = a.employee_id
     JOIN massages m   ON m.id = a.massage_id
     LEFT JOIN rooms r ON r.id = a.room_id
     WHERE a.employee_id = ?
       AND DATE(a.start_time) BETWEEN ? AND ?
       AND a.status = 'completed'
     ORDER BY a.start_time`,
    [employeeId, startDate, endDate],
  );

  return (rows as any[]).map((r): StaffWorkEntry => ({
    date: r.date,
    time: r.time,
    meridiem: r.meridiem,
    staffName: r.staffName,
    staffImageUrl: r.staffImageUrl ?? null,
    serviceName: r.serviceName,
    roomLabel: r.roomNumber != null ? `ห้อง ${r.roomNumber}` : null,
    hourlyRateSnapshot: Number(r.hourlyRateSnapshot),
  }));
}

function dateToStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getPayrollHistory(): Promise<PayrollPeriod[]> {
  const [rows] = await db.query(
    `SELECT
       p.period_start, p.period_end,
       p.total_hours AS hours, p.total_amount AS salary,
       e.id, e.first_name AS firstName, e.last_name AS lastName
     FROM payroll p
     JOIN employees e ON e.id = p.employee_id
     ORDER BY p.period_start DESC, e.id`
  );

  const grouped = new Map<string, PayrollPeriod>();
  for (const r of rows as any[]) {
    const start = dateToStr(r.period_start as Date);
    const end = dateToStr(r.period_end as Date);
    const key = `${start}_${end}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        label: `${formatDateThai(start)} – ${formatDateThai(end)}`,
        rows: [],
      });
    }
    grouped.get(key)!.rows.push({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      hours: Number(r.hours),
      salary: Number(r.salary),
    });
  }

  return Array.from(grouped.values());
}
