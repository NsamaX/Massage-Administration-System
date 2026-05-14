"use client";

import { useState } from "react";
import type { PayrollPeriod, SalaryRow } from "../schema";
import { DAYS_TH, MONTHS_FULL_TH, addOneDay, formatPeriodShort, getToday, toDateKey, toThai } from "./report-utils";

type Props = {
  startDate: string;
  endDate: string;
  salaryRows: SalaryRow[];
  payrollHistory: PayrollPeriod[];
  pending: boolean;
  selectedStaffId: number | null;
  exportPending: boolean;
  onApply: (start: string, end: string) => void;
  onStaffClick: (row: SalaryRow) => void;
  onCreatePayroll: () => void;
  onExportDetailed: () => void;
};

export function PayrollSummaryCard({
  startDate, endDate, salaryRows, payrollHistory, pending,
  selectedStaffId, exportPending,
  onApply, onStaffClick, onCreatePayroll, onExportDetailed,
}: Props) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date(startDate).getFullYear());
  const [pickerMonth, setPickerMonth] = useState(() => new Date(startDate).getMonth());
  const [pickerStart, setPickerStart] = useState<string | null>(startDate);
  const [pickerEnd, setPickerEnd] = useState<string | null>(endDate);

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

  function handleApply() {
    if (!pickerStart) return;
    const newStart = pickerStart;
    const newEnd = pickerEnd ?? pickerStart;
    setDatePickerOpen(false);
    onApply(newStart, newEnd);
  }

  function prevPickerMonth() {
    if (pickerMonth === 0) { setPickerYear((y) => y - 1); setPickerMonth(11); }
    else setPickerMonth((m) => m - 1);
  }

  function nextPickerMonth() {
    if (pickerMonth === 11) { setPickerYear((y) => y + 1); setPickerMonth(0); }
    else setPickerMonth((m) => m + 1);
  }

  return (
    <div className="card report-payroll-summary">
      <div className="head stacked">
        <div className="head-title-row">
          <h3>สรุปเงินเดือน</h3>
          <span className="caps">{isHistoryView ? "ประวัติ" : "งวดนี้"}</span>
        </div>
        <div className="filter-wrap">
          <button type="button" className="picker-btn" onClick={openPicker}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <rect x="1.5" y="2.5" width="9" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
              <path d="M1.5 5h9M4 1v2.5M8 1v2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <span>{formatPeriodShort(startDate, endDate)}</span>
          </button>

          {datePickerOpen && (
            <>
              <div className="overlay-dismiss-z20" onClick={() => setDatePickerOpen(false)} />
              <div className="picker-popup">
                <div className="cal-head">
                  <div className="cal-month">
                    {MONTHS_FULL_TH[pickerMonth]} <em>{toThai(pickerYear + 543)}</em>
                  </div>
                  <div className="cal-nav-group">
                    <button type="button" className="cal-nav" onClick={prevPickerMonth}>‹</button>
                    <button type="button" className="cal-nav" onClick={nextPickerMonth}>›</button>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      {DAYS_TH.map((d) => (
                        <th key={d}>{d}</th>
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
                            <td key={dow}>
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
                  <p className="picker-hint">เลือกวันสิ้นสุด</p>
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

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th style={{ width: "52px" }}>รหัส</th>
              <th>ชื่อ-สกุล</th>
              <th>ชม.</th>
              <th>เงินเดือน</th>
            </tr>
          </thead>
          <tbody>
            {salaryRows.map((row) => (
              <tr
                key={row.id}
                className="row-link"
                style={selectedStaffId === row.id ? { background: "var(--line)" } : undefined}
                onClick={() => onStaffClick(row)}
              >
                <td className="mono">{row.staffCode ?? "—"}</td>
                <td>{row.firstName} {row.lastName}</td>
                <td className="mono">{row.hours}</td>
                <td className="mono">฿{row.salary.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="payroll-actions">
        {isHistoryView ? (
          salaryRows.some((r) => r.hours > 0) && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onExportDetailed}
              disabled={exportPending}
            >
              {exportPending ? "กำลังส่งออก..." : "ส่งออก Excel"}
            </button>
          )
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onCreatePayroll}
            disabled={pending || !salaryRows.some((r) => r.hours > 0)}
          >
            {pending ? "กำลังบันทึก..." : "สรุป & ปิดงวด"}
          </button>
        )}
      </div>
    </div>
  );
}
