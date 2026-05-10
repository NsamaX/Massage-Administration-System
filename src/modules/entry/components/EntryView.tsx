"use client";

import { useState, useTransition } from "react";
import { addManualEntry } from "../server";
import type { EntryOptions, RecentEntry } from "../schema";

const MONTHS_SHORT_TH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function formatDatePart(isoLocal: string) {
  const [datePart] = isoLocal.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  return `${d} ${MONTHS_SHORT_TH[m - 1]} ${String(y + 543).slice(2)}`;
}

function formatTimePart(isoLocal: string) {
  const [, timePart] = isoLocal.split("T");
  return timePart?.slice(0, 5) ?? "";
}

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

type Props = {
  options: EntryOptions;
  initialEntries: RecentEntry[];
};

export function EntryView({ options, initialEntries }: Props) {
  const [staffId, setStaffId] = useState("");
  const [massageId, setMassageId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [entries, setEntries] = useState(initialEntries);
  const [justSaved, setJustSaved] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sortAsc, setSortAsc] = useState(false);
  const [filterStaff, setFilterStaff] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const canSubmit = !!staffId && !!massageId && !pending;

  const staffNames = Array.from(new Set(entries.map((e) => e.staffName)));
  const displayedEntries = entries
    .filter((e) => filterStaff === null || e.staffName === filterStaff)
    .sort((a, b) => {
      const cmp = a.startTime.localeCompare(b.startTime);
      return sortAsc ? cmp : -cmp;
    });

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!canSubmit) return;

    const startTime = dateValue ? `${dateValue}T${timeValue || "00:00"}` : null;

    setSubmitError(null);
    startTransition(async () => {
      const res = await addManualEntry(
        Number(staffId),
        Number(massageId),
        roomId ? Number(roomId) : null,
        startTime
      );
      if (res.error) { setSubmitError(res.error); return; }
      setEntries(res.entries);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    });
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">03 · workspace</div>
          <h1>ลงข้อมูล<em> นัดหมาย</em></h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="caps">รายการที่บันทึก {entries.length} รายการ</div>
        </div>
      </div>

      {/* Form card */}
      <div className="card" style={{ marginBottom: "32px" }}>
        <div className="body">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <span className="lbl">พนักงาน</span>
                <select
                  className="select-field"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                >
                  <option value="">เลือกพนักงาน…</option>
                  {options.staff.map((s) => (
                    <option key={s.id} value={String(s.id)}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <span className="lbl">แผนนวด</span>
                <select
                  className="select-field"
                  value={massageId}
                  onChange={(e) => setMassageId(e.target.value)}
                >
                  <option value="">เลือกแผนนวด…</option>
                  {options.massages.map((m) => (
                    <option key={m.id} value={String(m.id)}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <span className="lbl">วันที่ <em>เว้นว่าง = วันนี้</em></span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="date"
                    className="input"
                    value={dateValue}
                    onChange={(e) => {
                      setDateValue(e.target.value);
                      if (!e.target.value) setTimeValue("");
                    }}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="time"
                    className="input"
                    value={timeValue}
                    onChange={(e) => setTimeValue(e.target.value)}
                    disabled={!dateValue}
                    style={{ width: "120px", opacity: !dateValue ? .4 : 1 }}
                  />
                </div>
              </div>

              <div className="field">
                <span className="lbl">ห้อง <em>ไม่จำเป็น</em></span>
                <select
                  className="select-field"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                >
                  <option value="">ไม่ระบุ</option>
                  {options.rooms.map((r) => (
                    <option key={r.id} value={String(r.id)}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="actions">
                {submitError && (
                  <span style={{ marginRight: "auto", fontSize: "12px", color: "var(--danger)" }}>{submitError}</span>
                )}
                {justSaved && !submitError && (
                  <span style={{ marginRight: "auto", fontSize: "12px", color: "var(--ok)", fontFamily: '"JetBrains Mono", monospace', letterSpacing: ".04em" }}>
                    บันทึกแล้ว
                  </span>
                )}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!canSubmit}
                >
                  {pending ? "กำลังบันทึก..." : "＋ บันทึกนัดหมาย"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Recent entries */}
      {filterOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
      )}
      <div className="card">
        <div className="head">
          <div>
            <h3>รายการที่บันทึกแล้ว</h3>
            <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>บันทึก 30 รายการล่าสุด</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setFilterOpen((v) => !v)}
                title="กรอง"
                style={filterStaff ? { borderColor: "var(--umber)", color: "var(--umber)" } : undefined}
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
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>พนักงาน</th>
                  <th>แผนนวด</th>
                  <th>ห้อง</th>
                  <th>วันที่</th>
                </tr>
              </thead>
              <tbody>
                {displayedEntries.map((entry) => (
                  <tr key={entry.id} className="row-link">
                    <td>
                      <span className="mono" style={{ fontSize: "13px", color: "var(--ink)" }}>{formatTimePart(entry.startTime)}</span>
                    </td>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {entry.staffName}
                      </span>
                    </td>
                    <td>
                      {entry.massageName}
                      <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--muted)" }}>{entry.durationMin} นาที</span>
                    </td>
                    <td>{entry.roomLabel ?? "—"}</td>
                    <td>
                      <span style={{ fontSize: "12px", color: "var(--muted)" }}>{formatDatePart(entry.startTime)}</span>
                    </td>
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
