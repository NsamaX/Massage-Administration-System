"use client";

import { useState } from "react";
import type { HistoryEntry } from "../schema";
import { getInitials } from "./dashboard-utils";

type Props = {
  history: HistoryEntry[];
  pending: boolean;
  historyLabel: string;
};

export function ServiceHistoryTable({ history, pending, historyLabel }: Props) {
  const [sortAsc, setSortAsc] = useState(true);
  const [filterStaff, setFilterStaff] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const staffOnDate = history.reduce<{ name: string; imageUrl: string | null }[]>((acc, e) => {
    if (acc.some((x) => x.name === e.staffName)) return acc;
    acc.push({ name: e.staffName, imageUrl: e.staffImageUrl ?? null });
    return acc;
  }, []);

  const filteredHistory = history
    .filter((e) => filterStaff === null || e.staffName === filterStaff)
    .sort((a, b) => {
      const cmp = a.time.localeCompare(b.time);
      return sortAsc ? cmp : -cmp;
    });

  return (
    <div className="section" style={{ opacity: pending ? 0.5 : 1, transition: "opacity .15s" }}>
      <div className="card">
        <div className="head">
          <div>
            <h3>ประวัติการให้บริการ</h3>
            <span className="card-subtitle">{historyLabel}</span>
          </div>
          <div className="head-actions">
            <div className="filter-wrap">
              {filterOpen && (
                <div className="overlay-dismiss" onClick={() => setFilterOpen(false)} />
              )}
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
                  {staffOnDate.map(({ name }) => (
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

        {filteredHistory.length > 0 ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>พนักงาน</th>
                  <th>แผนนวด</th>
                  <th>ห้อง</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((entry, idx) => (
                  <tr key={idx} className="row-link">
                    <td>
                      <span className="td-time">
                        {entry.time}{entry.endTime ? `–${entry.endTime}` : ""}
                      </span>
                      <span className="td-meridiem">{entry.meridiem}</span>
                    </td>
                    <td>
                      <span className="td-staff">
                        <span className="staff-av-xs">
                          {entry.staffImageUrl ? (
                            <img src={entry.staffImageUrl} alt={entry.staffName} />
                          ) : getInitials(entry.staffName)}
                        </span>
                        {entry.staffName}
                      </span>
                    </td>
                    <td>{entry.serviceName}</td>
                    <td>{entry.roomLabel ?? "—"}</td>
                    <td>
                      <span className="chip">
                        <span className="dot" />
                        {entry.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="history-empty">
            <div className="ic">— เงียบสงบ —</div>
            <p>ยังไม่มีรายการบันทึกในวันที่เลือก</p>
          </div>
        )}
      </div>
    </div>
  );
}
