"use client";

import { useState, useTransition } from "react";
import { addRoom, deleteRoom, getHistoryByDate } from "../server";
import type { DashboardStats, HistoryEntry, RoomState } from "../schema";

const DAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const FULL_DAYS_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";

function toThai(n: number) {
  return String(n).split("").map((d) => THAI_DIGITS[Number(d)]).join("");
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  stats: DashboardStats;
  rooms: RoomState[];
  initialHistory: HistoryEntry[];
  activeDates: string[];
};

export function DashboardView({ stats, rooms, initialHistory, activeDates }: Props) {
  const TODAY = new Date();
  const todayKey = toDateKey(TODAY);

  const [selectedDate, setSelectedDate] = useState<Date>(TODAY);
  const [displayYear, setDisplayYear] = useState(TODAY.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(TODAY.getMonth());
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const [historyPending, startHistoryTransition] = useTransition();
  const [sortAsc, setSortAsc] = useState(true);
  const [filterStaff, setFilterStaff] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState<number | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const datesWithHistory = new Set(activeDates);
  const selectedKey = toDateKey(selectedDate);

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

  function selectDate(year: number, month: number, day: number) {
    const date = new Date(year, month, day);
    const key = toDateKey(date);
    setSelectedDate(date);
    setFilterStaff(null);
    startHistoryTransition(async () => {
      const rows = await getHistoryByDate(key);
      setHistory(rows);
    });
  }

  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  const firstDayOffset = new Date(displayYear, displayMonth, 1).getDay();

  function prevMonth() {
    if (displayMonth === 0) { setDisplayYear((y) => y - 1); setDisplayMonth(11); }
    else setDisplayMonth((m) => m - 1);
  }
  function nextMonth() {
    if (displayMonth === 11) { setDisplayYear((y) => y + 1); setDisplayMonth(0); }
    else setDisplayMonth((m) => m + 1);
  }

  const isToday = selectedKey === todayKey;
  const historyLabel = isToday
    ? "บันทึกของวันนี้"
    : `${selectedDate.getDate()} ${MONTHS_TH[selectedDate.getMonth()]} ${selectedDate.getFullYear() + 543}`;

  return (
    <>
      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="crumb">01 · workspace</div>
          <h1>ภาพรวม<em> วันนี้</em></h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="caps">
            {FULL_DAYS_TH[TODAY.getDay()]}ที่ {TODAY.getDate()} {MONTHS_TH[TODAY.getMonth()]} {toThai(TODAY.getFullYear() + 543)}
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="section">
        <div className="stat-grid">
          <div className="stat">
            <span className="lbl">พนักงานพร้อมบริการ</span>
            <div className="val">{stats.availableStaff}<span className="unit">/ {stats.totalStaff} คน</span></div>
          </div>
          <div className="stat">
            <span className="lbl">ห้องที่ใช้อยู่</span>
            <div className="val">{stats.occupiedRooms}<span className="unit">/ {stats.totalRooms} ห้อง</span></div>
          </div>
          <div className="stat">
            <span className="lbl">ลูกค้าวันนี้</span>
            <div className="val">{stats.todayCustomers}<span className="unit">คน</span></div>
          </div>
          <div className="stat">
            <span className="lbl">รายได้วันนี้</span>
            <div className="val">{stats.todayRevenue}<span className="unit">บาท</span></div>
          </div>
        </div>
      </div>

      {/* Dash grid: rooms + calendar */}
      <div className="section" style={{ marginTop: "36px" }}>
        <div className="dash-grid">
          <div>
            {deletingRoomId !== null && (
              <div className="fixed inset-0 z-10" onClick={() => setDeletingRoomId(null)} />
            )}

            <div className="rooms">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  isDeleting={deletingRoomId === room.id}
                  onSelect={() => { if (!room.staffName) setDeletingRoomId(room.id); }}
                  onDelete={() => {
                    setRoomError(null);
                    startTransition(async () => {
                      const res = await deleteRoom(room.id);
                      if (res.error) { setRoomError(res.error); return; }
                      setDeletingRoomId(null);
                    });
                  }}
                />
              ))}
              <button
                type="button"
                className="room-add"
                disabled={pending}
                onClick={() => {
                  setRoomError(null);
                  startTransition(async () => {
                    const res = await addRoom();
                    if (res.error) setRoomError(res.error);
                  });
                }}
                aria-label="เพิ่มห้อง"
              >
                +
              </button>
            </div>

            {roomError && (
              <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--danger)" }}>{roomError}</p>
            )}
          </div>

          {/* Calendar */}
          <aside>
            <div className="card cal">
            <div className="cal-head">
              <div className="cal-month">
                {MONTHS_TH[displayMonth]} <em>{toThai(displayYear + 543)}</em>
              </div>
              <div>
                <button type="button" className="cal-nav" onClick={prevMonth}>‹</button>
                <button type="button" className="cal-nav" onClick={nextMonth}>›</button>
              </div>
            </div>
            <table>
              <thead>
                <tr>{DAYS_TH.map((d) => <th key={d}>{d}</th>)}</tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.ceil((firstDayOffset + daysInMonth) / 7) }).map((_, week) => (
                  <tr key={week}>
                    {Array.from({ length: 7 }).map((_, dow) => {
                      const day = week * 7 + dow - firstDayOffset + 1;
                      if (day < 1 || day > daysInMonth) return <td key={dow} />;
                      const key = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const isSelected = key === selectedKey;
                      const isT = key === todayKey;
                      const hasDot = datesWithHistory.has(key) && !isSelected;
                      return (
                        <td
                          key={dow}
                          className={[isSelected ? "sel" : "", isT && !isSelected ? "today" : "", hasDot ? "has-dot" : ""].filter(Boolean).join(" ")}
                          onClick={() => selectDate(displayYear, displayMonth, day)}
                        >
                          {day}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </aside>
        </div>
      </div>

      {/* History table */}
      <div className="section" style={{ marginTop: "36px", opacity: historyPending ? 0.5 : 1, transition: "opacity .15s" }}>
        <div className="card">
          <div className="head">
            <div>
              <h3>ประวัติการให้บริการ</h3>
              <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>{historyLabel}</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ position: "relative" }}>
                {filterOpen && (
                  <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                )}
                <button
                  type="button"
                  className={`btn-icon${filterStaff ? "" : ""}`}
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
            <div style={{ overflowX: "auto" }}>
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
    </>
  );
}

function RoomCard({
  room, isDeleting, onSelect, onDelete,
}: {
  room: RoomState;
  isDeleting: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const occupied = room.staffName !== null;
  return (
    <div
      className={`room${occupied ? " busy" : ""}`}
      style={{ position: "relative" }}
      onClick={onSelect}
    >
      <div className="top">
        <span className="r-num">ห้อง {toThai(room.number)}</span>
        <span className="r-state">
          <span className="d" />
          {occupied ? `กำลังใช้` : "ว่าง"}
        </span>
      </div>
      {occupied ? (
        <>
          <div className="who">{room.staffName}</div>
          <div className="svc">
            {room.serviceName}
            {room.startTime && ` · เริ่ม ${room.startTime}`}
          </div>
        </>
      ) : (
        <div className="empty">—</div>
      )}

      {isDeleting && (
        <div
          className="room-delete-overlay"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <button className="room-delete-btn" type="button" aria-label="ลบห้อง">×</button>
        </div>
      )}
    </div>
  );
}
