"use client";

import { useState, useTransition } from "react";
import { assignAppointment } from "../server";
import type { MassageOption, RoomOption, StaffStatus } from "../schema";
import { useScrollLock } from "@/modules/core/client";

type Props = {
  open: boolean;
  onClose: () => void;
  staff: StaffStatus | null;
  massages: MassageOption[];
  rooms: RoomOption[];
};

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

export function AssignDialog({ open, onClose, staff, massages, rooms }: Props) {
  const [selectedMassageId, setSelectedMassageId] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useScrollLock(open && !!staff);

  if (!open || !staff) return null;

  function handleClose() {
    setSelectedMassageId(null);
    setSelectedRoomId(null);
    setError(null);
    onClose();
  }

  function handleAssign() {
    if (!selectedMassageId) return;
    setError(null);
    startTransition(async () => {
      const res = await assignAppointment(staff!.id, selectedMassageId, selectedRoomId);
      if (res.error) { setError(res.error); return; }
      handleClose();
    });
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Head */}
        <div className="modal-head">
          <h3 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "20px", fontWeight: 500 }}>
            มอบหมายงาน
          </h3>
          <button type="button" className="modal-close" onClick={handleClose} aria-label="ปิด">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Staff header */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid var(--line-soft)" }}>
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              background: "var(--ink)", color: "#faf6ee",
              display: "grid", placeItems: "center",
              fontFamily: '"Cormorant Garamond", serif',
              fontStyle: "italic", fontSize: "20px", fontWeight: 500,
              flexShrink: 0, overflow: "hidden",
            }}>
              {staff.imageUrl
                ? <img src={staff.imageUrl} alt={staff.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : getInitials(staff.name)
              }
            </div>
            <div>
              <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "18px", fontWeight: 500 }}>
                {staff.name}
              </div>
              {staff.phone && (
                <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                  {staff.phone}
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                {staff.skills.map((skill) => (
                  <span key={skill} className="chip"><span className="dot" />{skill}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="field">
              <span className="lbl">แผนนวด</span>
              <select
                className="select-field"
                value={selectedMassageId ?? ""}
                onChange={(e) => setSelectedMassageId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">เลือกแผนนวด…</option>
                {massages.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <span className="lbl">ห้อง</span>
              <select
                className="select-field"
                value={selectedRoomId ?? ""}
                onChange={(e) => setSelectedRoomId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">ไม่ระบุห้อง</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-foot">
          {error && (
            <span style={{ marginRight: "auto", fontSize: "12px", color: "var(--danger)" }}>{error}</span>
          )}
          <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={pending}>
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAssign}
            disabled={!selectedMassageId || !selectedRoomId || pending}
          >
            {pending ? "กำลังบันทึก..." : "มอบหมาย"}
          </button>
        </div>
      </div>
    </div>
  );
}
