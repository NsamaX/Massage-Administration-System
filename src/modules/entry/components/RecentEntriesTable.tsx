"use client";

import { useState } from "react";
import type { RecentEntry } from "../schema";

const MONTHS_SHORT_TH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function formatDateThai(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTHS_SHORT_TH[m - 1]} ${y + 543}`;
}

function formatDuration(min: number): string {
  if (min % 60 === 0) return `${min / 60} ชม.`;
  if (min > 60) return `${Math.floor(min / 60)} ชม. ${min % 60} นาที`;
  return `${min} นาที`;
}


export function RecentEntriesTable({ entries }: { entries: RecentEntry[] }) {
  const [sortAsc, setSortAsc] = useState(false);
  const [filterStaff, setFilterStaff] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const staffNames = Array.from(new Set(entries.map((e) => e.staffName)));
  const displayedEntries = entries
    .filter((e) => filterStaff === null || e.staffName === filterStaff)
    .sort((a, b) => {
      const cmp = `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
      return sortAsc ? cmp : -cmp;
    });

  return (
    <>
      {filterOpen && (
        <div className="overlay-dismiss" onClick={() => setFilterOpen(false)} />
      )}
      <div className="card">
        <div className="head">
          <div>
            <h3>รายการที่บันทึกแล้ว</h3>
            <span className="card-subtitle">บันทึก 30 รายการล่าสุด</span>
          </div>
          <div className="head-actions">
            <div className="filter-wrap">
              <button
                type="button"
                className={`btn-icon${filterStaff ? " active" : ""}`}
                onClick={() => setFilterOpen((v) => !v)}
                title="กรอง"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 3h10M4 7h6M6 11h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
              {filterOpen && (
                <div className="filter-dropdown">
                  <button
                    type="button"
                    className={`filter-item${filterStaff === null ? " active" : ""}`}
                    onClick={() => { setFilterStaff(null); setFilterOpen(false); }}
                  >
                    ทั้งหมด
                  </button>
                  {staffNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className={`filter-item${filterStaff === name ? " active" : ""}`}
                      onClick={() => { setFilterStaff(name); setFilterOpen(false); }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={() => setSortAsc((v) => !v)}
              title="เรียง"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                {sortAsc ? (
                  <path d="M4 11V3M4 3L2 5M4 3l2 2M10 3v8M10 11l-2-2M10 11l2-2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                ) : (
                  <path d="M4 3v8M4 11L2 9M4 11l2-2M10 11V3M10 3l-2 2M10 3l2 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="history-empty">
            <div className="ic">— เงียบสงบ —</div>
            <p>ยังไม่มีรายการ</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>เวลา</th>
                  <th>รหัส</th>
                  <th>พนักงาน</th>
                  <th>แผนนวด</th>
                  <th>ห้อง</th>
                  <th>เวลาทำงาน</th>
                  <th>ค่าแรง/ชม</th>
                  <th>รายได้</th>
                </tr>
              </thead>
              <tbody>
                {displayedEntries.map((entry) => (
                  <tr key={entry.id} className="row-link">
                    <td className="mono">{formatDateThai(entry.date)}</td>
                    <td>
                      <span className="td-time">{entry.time}–{entry.endTime}</span>
                      <span className="td-meridiem">{entry.meridiem}</span>
                    </td>
                    <td className="mono">{entry.staffCode ?? "—"}</td>
                    <td><span className="td-staff">{entry.staffName}</span></td>
                    <td>
                      {entry.massageName}
                      <span className="td-meta">{entry.durationMin} นาที</span>
                    </td>
                    <td>{entry.roomLabel ?? "—"}</td>
                    <td className="mono">{formatDuration(entry.durationMin)}</td>
                    <td className="mono">฿{entry.hourlyRateSnapshot.toLocaleString()}</td>
                    <td className="mono td-strong">฿{entry.computedSalary.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
