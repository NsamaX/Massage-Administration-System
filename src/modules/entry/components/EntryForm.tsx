"use client";

import { useState, useTransition } from "react";
import { addManualEntry } from "../server";
import type { EntryOptions, RecentEntry } from "../schema";

type Props = {
  options: EntryOptions;
  onSaved: (entries: RecentEntry[]) => void;
};

export function EntryForm({ options, onSaved }: Props) {
  const [staffId, setStaffId] = useState("");
  const [massageId, setMassageId] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [roomId, setRoomId] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canSubmit = !!staffId && !!massageId && !pending;

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!canSubmit) return;

    const startTime = dateValue ? `${dateValue}T${timeValue || "00:00"}` : null;
    const effectiveDuration = selectedDuration ?? undefined;

    setSubmitError(null);
    startTransition(async () => {
      const res = await addManualEntry(
        Number(staffId),
        Number(massageId),
        roomId ? Number(roomId) : null,
        startTime,
        effectiveDuration
      );
      if (res.error) { setSubmitError(res.error); return; }
      onSaved(res.entries);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    });
  }

  return (
    <div className="card">
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
              <span className="lbl">วันที่ <em>เว้นว่าง = วันนี้</em></span>
              <div className="head-actions">
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
              <span className="lbl">แผนนวด</span>
              <select
                className="select-field"
                value={massageId}
                onChange={(e) => {
                  setMassageId(e.target.value);
                  setSelectedDuration(null);
                }}
              >
                <option value="">เลือกแผนนวด…</option>
                {options.massages.map((m) => (
                  <option key={m.id} value={String(m.id)}>{m.label}</option>
                ))}
              </select>
              {(() => {
                const m = options.massages.find((m) => String(m.id) === massageId);
                if (!m || m.durations.length === 0) return null;
                const displayDurations = [...new Set([m.duration, ...m.durations])].sort((a, b) => a - b);
                return (
                  <div className="duration-picker">
                    {displayDurations.map((d) => {
                      const active = (selectedDuration ?? m.duration) === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          className={`btn-duration${active ? " active" : ""}`}
                          onClick={() => setSelectedDuration(d)}
                        >
                          {d} นาที
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
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
              {submitError && <span className="form-error">{submitError}</span>}
              {justSaved && !submitError && (
                <span className="form-saved">บันทึกแล้ว</span>
              )}
              <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
                {pending ? "กำลังบันทึก..." : "＋ บันทึกนัดหมาย"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
