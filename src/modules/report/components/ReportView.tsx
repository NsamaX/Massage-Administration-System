"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPayroll, getReportData, getStaffWorkHistory } from "../server";
import type { PayrollPeriod, ReportData, SalaryRow, StaffWorkEntry } from "../schema";

const DAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTHS_SHORT_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const MONTHS_FULL_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const DONUT_COLORS = ["var(--ink)", "var(--umber)", "var(--sage)", "var(--brass)", "var(--clay)"];

function getInitials(name: string) {
  const thaiConsonant = /[ก-ฮ]/;
  return name.trim().split(/\s+/).slice(0, 2).map((word) => {
    if (/[฀-๿]/.test(word)) {
      for (const ch of word) if (thaiConsonant.test(ch)) return ch;
      return word[0] ?? "";
    }
    return (word[0] ?? "").toUpperCase();
  }).join("");
}

function toDateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDateThai(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTHS_SHORT_TH[m - 1]} ${y + 543}`;
}

function formatPeriodShort(start: string, end: string) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  if (sm === em && sy === ey) return `${sd}–${ed} ${MONTHS_SHORT_TH[sm - 1]} ${sy + 543}`;
  return `${sd} ${MONTHS_SHORT_TH[sm - 1]} – ${ed} ${MONTHS_SHORT_TH[em - 1]} ${ey + 543}`;
}

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function addOneDay(dateStr: string) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Props = {
  initialStartDate: string;
  initialEndDate: string;
  initialData: ReportData;
  payrollHistory: PayrollPeriod[];
};

export function ReportView({ initialStartDate, initialEndDate, initialData, payrollHistory }: Props) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [data, setData] = useState<ReportData>(initialData);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState<string | null>(null);
  const [staffWork, setStaffWork] = useState<StaffWorkEntry[]>([]);
  const [workPending, startWorkTransition] = useTransition();

  const [pickerYear, setPickerYear] = useState(() => new Date(initialStartDate).getFullYear());
  const [pickerMonth, setPickerMonth] = useState(() => new Date(initialStartDate).getMonth());
  const [pickerStart, setPickerStart] = useState<string | null>(initialStartDate);
  const [pickerEnd, setPickerEnd] = useState<string | null>(initialEndDate);

  const today = getToday();

  const lastPaidDate = payrollHistory.length > 0
    ? payrollHistory.reduce((max, h) => {
        const end = h.key.split("_")[1];
        return end > max ? end : max;
      }, "")
    : null;

  const firstUnpaidDate = lastPaidDate ? addOneDay(lastPaidDate) : null;
  const isConstrained = firstUnpaidDate !== null;

  const isHistoryView = payrollHistory.some((h) => {
    const [s, e] = h.key.split("_");
    return s === startDate && e === endDate;
  });

  const periodLabel = `${formatDateThai(startDate)} – ${formatDateThai(endDate)}`;

  function openPicker() {
    if (!datePickerOpen) {
      if (isConstrained && (isHistoryView || startDate < firstUnpaidDate!)) {
        const d = new Date(firstUnpaidDate!);
        setPickerYear(d.getFullYear());
        setPickerMonth(d.getMonth());
        setPickerStart(null);
        setPickerEnd(null);
      } else {
        setPickerYear(new Date(startDate).getFullYear());
        setPickerMonth(new Date(startDate).getMonth());
        setPickerStart(startDate);
        setPickerEnd(endDate);
      }
    }
    setDatePickerOpen((v) => !v);
  }

  function handlePickerDayClick(key: string) {
    if ((lastPaidDate && key <= lastPaidDate) || key > today) return;
    if (!pickerStart || pickerEnd) {
      setPickerStart(key);
      setPickerEnd(null);
    } else if (key < pickerStart) {
      setPickerEnd(pickerStart);
      setPickerStart(key);
    } else if (key === pickerStart) {
      setPickerStart(null);
      setPickerEnd(null);
    } else {
      setPickerEnd(key);
    }
  }

  function clearStaffWork() {
    setSelectedStaffId(null);
    setSelectedStaffName(null);
    setStaffWork([]);
  }

  function handleStaffClick(row: SalaryRow) {
    if (selectedStaffId === row.id) { clearStaffWork(); return; }
    setSelectedStaffId(row.id);
    setSelectedStaffName(`${row.firstName} ${row.lastName}`);
    startWorkTransition(async () => {
      const entries = await getStaffWorkHistory(row.id, startDate, endDate);
      setStaffWork(entries);
    });
  }

  function handleApply() {
    if (!pickerStart) return;
    const newStart = pickerStart;
    const newEnd = pickerEnd ?? pickerStart;
    setStartDate(newStart);
    setEndDate(newEnd);
    setDatePickerOpen(false);
    clearStaffWork();
    startTransition(async () => {
      const newData = await getReportData(newStart, newEnd);
      setData(newData);
    });
  }

  function handleHistoryClick(h: PayrollPeriod) {
    const [hStart, hEnd] = h.key.split("_");
    setStartDate(hStart);
    setEndDate(hEnd);
    clearStaffWork();
    startTransition(async () => {
      const newData = await getReportData(hStart, hEnd);
      setData(newData);
    });
  }

  function handleCreatePayroll() {
    startTransition(async () => {
      await createPayroll(startDate, endDate);
      router.refresh();
    });
  }

  function prevPickerMonth() {
    if (pickerMonth === 0) { setPickerYear((y) => y - 1); setPickerMonth(11); }
    else setPickerMonth((m) => m - 1);
  }
  function nextPickerMonth() {
    if (pickerMonth === 11) { setPickerYear((y) => y + 1); setPickerMonth(0); }
    else setPickerMonth((m) => m + 1);
  }

  const totalCustomers = data.dailyCounts.reduce((s, c) => s + c, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">06 · insight</div>
          <h1>รายงาน <em>การดำเนินงาน</em></h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="caps">ช่วงรายงาน {formatPeriodShort(startDate, endDate)}</div>
        </div>
      </div>

      <div className="reports-grid" style={{ opacity: pending ? .6 : 1, transition: "opacity .2s" }}>

        {/* [1,1] Bar chart */}
        <div className="card chart-card report-bar">
          <div className="ch-head">
            <div>
              <div className="ttl">จำนวนลูกค้ารายวัน</div>
              <div className="range">{periodLabel} · {data.dailyCounts.length} วัน</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="big-num">{totalCustomers}<span className="unit">ครั้ง</span></div>
            </div>
          </div>
          <BarChart counts={data.dailyCounts} />
        </div>

        {/* [1,2] Payroll summary */}
        <div className="card report-payroll-summary">
          <div className="head" style={{ flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "baseline" }}>
              <h3>สรุปเงินเดือน</h3>
              <span className="caps">{isHistoryView ? "ประวัติ" : "งวดนี้"}</span>
            </div>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={openPicker}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  fontFamily: '"JetBrains Mono", monospace', fontSize: "11px", color: "var(--muted)",
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <rect x="1.5" y="2.5" width="9" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
                  <path d="M1.5 5h9M4 1v2.5M8 1v2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                </svg>
                <span>{formatPeriodShort(startDate, endDate)}</span>
              </button>

              {datePickerOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setDatePickerOpen(false)} />
                  <div className="picker-popup">
                    <div className="cal-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <div className="cal-month">
                        {MONTHS_FULL_TH[pickerMonth]} <em>{pickerYear + 543}</em>
                      </div>
                      <div style={{ display: "flex", gap: "2px" }}>
                        <button
                          type="button"
                          className="cal-nav"
                          onClick={prevPickerMonth}
                          style={{ minWidth: "40px", minHeight: "40px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}
                        >‹</button>
                        <button
                          type="button"
                          className="cal-nav"
                          onClick={nextPickerMonth}
                          style={{ minWidth: "40px", minHeight: "40px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}
                        >›</button>
                      </div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {DAYS_TH.map((d) => (
                            <th key={d} style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "9px", letterSpacing: ".16em", color: "var(--faint)", fontWeight: 400, padding: "6px 0", textAlign: "center", border: "none" }}>
                              {d}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: Math.ceil((new Date(pickerYear, pickerMonth, 1).getDay() + new Date(pickerYear, pickerMonth + 1, 0).getDate()) / 7) }).map((_, week) => (
                          <tr key={week}>
                            {Array.from({ length: 7 }).map((_, dow) => {
                              const day = week * 7 + dow - new Date(pickerYear, pickerMonth, 1).getDay() + 1;
                              if (day < 1 || day > new Date(pickerYear, pickerMonth + 1, 0).getDate()) return <td key={dow} />;
                              const key = toDateKey(pickerYear, pickerMonth, day);
                              const isPaid = !!(lastPaidDate && key <= lastPaidDate);
                              const isFuture = key > today;
                              const isDisabled = isPaid || isFuture;
                              const isStart = key === pickerStart;
                              const isEnd = key === pickerEnd;
                              const inRange = !!(pickerStart && pickerEnd && key > pickerStart && key < pickerEnd);
                              const isT = key === today;
                              return (
                                <td key={dow} style={{ padding: 0, border: "none", textAlign: "center", height: "32px" }}>
                                  <button
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => handlePickerDayClick(key)}
                                    style={{
                                      width: "28px", height: "28px",
                                      borderRadius: "50%",
                                      border: isT && !isStart && !isEnd ? "1px solid var(--brass)" : "none",
                                      background: (isStart || isEnd) ? "var(--ink)" : inRange ? "var(--line)" : "transparent",
                                      color: isDisabled ? "var(--faint)" : (isStart || isEnd) ? "#faf6ee" : "var(--ink-2)",
                                      fontFamily: '"JetBrains Mono", monospace',
                                      fontSize: "12px",
                                      cursor: isDisabled ? "default" : "pointer",
                                      opacity: isPaid ? .35 : 1,
                                    }}
                                  >
                                    {day}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {pickerStart && !pickerEnd && (
                      <p style={{ marginTop: "10px", textAlign: "center", fontSize: "11px", color: "var(--muted)", fontFamily: '"JetBrains Mono", monospace' }}>เลือกวันสิ้นสุด</p>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleApply}
                      disabled={!pickerStart}
                      style={{ width: "100%", justifyContent: "center", marginTop: "12px" }}
                    >
                      ยืนยัน
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "36px" }}>#</th>
                  <th>ชื่อ-สกุล</th>
                  <th>ชม.</th>
                  <th>เงินเดือน</th>
                </tr>
              </thead>
              <tbody>
                {data.salaryRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="row-link"
                    style={selectedStaffId === row.id ? { background: "var(--line)" } : undefined}
                    onClick={() => handleStaffClick(row)}
                  >
                    <td><span className="num">{String(idx + 1).padStart(2, "0")}</span></td>
                    <td>
                      <span className="serif" style={{ fontSize: "15px" }}>{row.firstName}</span>{" "}
                      {row.lastName}
                    </td>
                    <td className="mono" style={{ fontSize: "12px" }}>{row.hours}</td>
                    <td className="mono" style={{ fontSize: "12px" }}>
                      ฿{row.salary.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="payroll-actions">
            {isHistoryView ? (
              data.salaryRows.some((r) => r.hours > 0) && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => exportToCSV(data.salaryRows, startDate, endDate)}
                >
                  ส่งออก Excel
                </button>
              )
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleCreatePayroll}
                disabled={pending || !data.salaryRows.some((r) => r.hours > 0)}
              >
                {pending ? "กำลังบันทึก..." : "สรุป & ปิดงวด"}
              </button>
            )}
          </div>
        </div>

        {/* [2,1] Donut chart */}
        <div className="card chart-card report-donut">
          <div className="ch-head">
            <div>
              <div className="ttl">แผนนวดยอดนิยม</div>
              <div className="range">สัดส่วนการให้บริการในช่วงรายงาน</div>
            </div>
          </div>
          <div className="donut-wrap">
            <DonutChart items={data.servicePopularity} />
            <div style={{ flex: 1 }}>
              {data.servicePopularity.length > 0 ? (
                data.servicePopularity.map((item, idx) => (
                  <div key={idx} className="donut-legend-row">
                    <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ width: "8px", height: "8px", background: DONUT_COLORS[idx % DONUT_COLORS.length], borderRadius: "50%", flexShrink: 0 }} />
                      <span className="serif" style={{ fontSize: "16px" }}>{item.name}</span>
                    </span>
                    <span className="mono" style={{ fontSize: "11.5px", color: "var(--muted)" }}>{item.percent}%</span>
                  </div>
                ))
              ) : (
                <div className="serif-it" style={{ color: "var(--faint)", fontSize: "16px" }}>ไม่มีข้อมูล</div>
              )}
            </div>
          </div>
        </div>

        {/* [2,2] Payroll history */}
        <div className="card report-history">
          <div className="head">
            <h3>ประวัติงวด</h3>
          </div>
          {payrollHistory.length === 0 ? (
            <div className="history-empty">
              <p>ยังไม่มีประวัติ</p>
            </div>
          ) : (
            payrollHistory.map((h) => {
              const [hStart, hEnd] = h.key.split("_");
              const isActive = startDate === hStart && endDate === hEnd;
              return (
                <button
                  key={h.key}
                  type="button"
                  className={`history-row${isActive ? " active" : ""}`}
                  onClick={() => handleHistoryClick(h)}
                >
                  <span style={{ display: "flex", alignItems: "center" }}>
                    <span className="d" />
                    <span className="lbl">{h.label}</span>
                  </span>
                  <span className="arrow">→</span>
                </button>
              );
            })
          )}
        </div>

      </div>

      {selectedStaffId !== null && (
        <div className="section" style={{ marginTop: "32px", opacity: workPending ? 0.5 : 1, transition: "opacity .15s" }}>
          <div className="card">
            <div className="head">
              <div>
                <h3>ประวัติการทำงาน</h3>
                <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>{selectedStaffName}</span>
              </div>
            </div>

            {staffWork.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>เวลา</th>
                      <th>พนักงาน</th>
                      <th>แผนนวด</th>
                      <th>ห้อง</th>
                      <th>วันที่</th>
                      <th>ค่าแรง/ชม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffWork.map((entry, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className="mono" style={{ fontSize: "13px", color: "var(--ink)" }}>{entry.time}</span>
                          <span style={{ display: "block", fontSize: "10px", color: "var(--faint)", letterSpacing: ".06em" }}>{entry.meridiem}</span>
                        </td>
                        <td>
                          <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "var(--line)", display: "grid", placeItems: "center", fontSize: "10px", flexShrink: 0 }}>
                              {entry.staffImageUrl ? (
                                <img src={entry.staffImageUrl} alt={entry.staffName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                              ) : getInitials(entry.staffName)}
                            </span>
                            {entry.staffName}
                          </span>
                        </td>
                        <td>{entry.serviceName}</td>
                        <td>{entry.roomLabel ?? "—"}</td>
                        <td className="mono" style={{ fontSize: "12px", color: "var(--muted)" }}>{formatDateThai(entry.date)}</td>
                        <td className="mono" style={{ fontSize: "12px" }}>฿{entry.hourlyRateSnapshot.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="history-empty">
                <p>ไม่มีรายการในช่วงเวลานี้</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function exportToCSV(rows: SalaryRow[], startDate: string, endDate: string) {
  const header = ["ลำดับ", "ชื่อ", "นามสกุล", "ชั่วโมง", "เงินเดือน (บาท)"];
  const lines = [
    header.join(","),
    ...rows.filter((r) => r.hours > 0).map((r, i) =>
      [i + 1, r.firstName, r.lastName, r.hours, r.salary].join(",")
    ),
  ];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `salary_${startDate}_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function BarChart({ counts }: { counts: number[] }) {
  const max = Math.max(...counts, 1);
  const total = counts.length;
  const labelStep = total <= 10 ? 1 : total <= 31 ? 5 : 7;
  const peakIdx = counts.indexOf(max);
  return (
    <div>
      <div className="bar-chart">
        {counts.map((count, idx) => (
          <div
            key={idx}
            className={`bar${idx === peakIdx && count > 0 ? " peak" : ""}`}
            style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? "2px" : "0" }}
            title={`วันที่ ${idx + 1}: ${count} คน`}
          />
        ))}
      </div>
      <div className="bar-chart-x">
        {counts.map((_, idx) =>
          (idx + 1) % labelStep === 0 || idx === 0
            ? <span key={idx}>{idx + 1}</span>
            : <span key={idx} />
        )}
      </div>
    </div>
  );
}

function DonutChart({ items }: { items: { name: string; percent: number }[] }) {
  const size = 160;
  const strokeWidth = 30;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const topName = items[0]?.name ?? "—";
  const topPercent = items[0]?.percent ?? 0;
  const hasData = items.some((i) => i.percent > 0);

  let cumulative = 0;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth={strokeWidth} />
        {hasData && items.map((item, idx) => {
          if (item.percent === 0) return null;
          const segLen = (item.percent / 100) * circumference;
          const dashOffset = circumference - (cumulative / 100) * circumference;
          cumulative += item.percent;
          return (
            <circle
              key={idx}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={DONUT_COLORS[idx % DONUT_COLORS.length]}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segLen} ${circumference - segLen}`}
              strokeDashoffset={dashOffset}
            />
          );
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="serif" style={{ fontSize: "26px", fontWeight: 500, lineHeight: 1 }}>
            {hasData ? topPercent : 0}
          </div>
          <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "3px", fontFamily: '"JetBrains Mono", monospace' }}>
            {hasData ? topName : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
