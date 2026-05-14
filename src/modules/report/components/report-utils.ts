import type { StaffWorkEntry } from "../schema";

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";
export function toThai(n: number) {
  return String(n).split("").map((d) => THAI_DIGITS[Number(d)]).join("");
}

export const DAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
export const MONTHS_SHORT_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
export const MONTHS_FULL_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
export const DONUT_COLORS = ["var(--ink)", "var(--umber)", "var(--sage)", "var(--brass)", "var(--clay)"];

export function getInitials(name: string) {
  const thaiConsonant = /[ก-ฮ]/;
  return name.trim().split(/\s+/).slice(0, 2).map((word) => {
    if (/[฀-๿]/.test(word)) {
      for (const ch of word) if (thaiConsonant.test(ch)) return ch;
      return word[0] ?? "";
    }
    return (word[0] ?? "").toUpperCase();
  }).join("");
}

export function toDateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function formatDateThai(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTHS_SHORT_TH[m - 1]} ${y + 543}`;
}

export function formatPeriodShort(start: string, end: string) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  if (sm === em && sy === ey) return `${sd}–${ed} ${MONTHS_SHORT_TH[sm - 1]} ${sy + 543}`;
  return `${sd} ${MONTHS_SHORT_TH[sm - 1]} – ${ed} ${MONTHS_SHORT_TH[em - 1]} ${ey + 543}`;
}

export function formatDuration(min: number): string {
  if (min % 60 === 0) return `${min / 60} ชม.`;
  if (min > 60) return `${Math.floor(min / 60)} ชม. ${min % 60} นาที`;
  return `${min} นาที`;
}

export function getDayDate(startDate: string, idx: number): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + idx);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function addOneDay(dateStr: string) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function exportDetailedCSV(entries: StaffWorkEntry[], startDate: string, endDate: string) {
  const header = ["รหัส", "ชื่อ-สกุล", "วันที่", "เวลาเริ่ม", "เวลาสิ้นสุด", "แผนนวด", "ระยะเวลา", "ห้อง", "ค่าแรง/ชม", "รายได้"];
  const lines = [
    header.join(","),
    ...entries.map((e) =>
      [
        e.staffCode ?? "",
        `"${e.staffName}"`,
        e.date,
        e.time,
        e.endTime,
        `"${e.serviceName}"`,
        formatDuration(e.durationMin),
        e.roomLabel ?? "",
        e.hourlyRateSnapshot,
        e.computedSalary,
      ].join(",")
    ),
  ];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `worklog_${startDate}_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
