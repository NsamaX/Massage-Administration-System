"use client";

import { useState, useTransition } from "react";
import type { UserRow, EmployeeOption } from "../schema";
import { createUser, updatePin } from "../server";
import { useScrollLock } from "@/modules/core/client";

function PinField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <span className="lbl">{label}</span>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder="••••"
        style={{ letterSpacing: "0.5em" }}
      />
    </div>
  );
}

export function CreateModal({
  availableEmployees,
  onClose,
}: {
  availableEmployees: EmployeeOption[];
  onClose: () => void;
}) {
  useScrollLock();
  const [role, setRole] = useState<"dev" | "admin" | "staff">("staff");
  const [employeeId, setEmployeeId] = useState<number | "">("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const needsEmployee = role !== "dev";

  function handleSave() {
    if (needsEmployee && !employeeId) { setError("กรุณาเลือกพนักงาน"); return; }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { setError("PIN ต้องเป็นตัวเลข 4 หลัก"); return; }
    if (pin !== confirmPin) { setError("PIN ไม่ตรงกัน"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createUser({
        roleName: role,
        employeeId: needsEmployee ? Number(employeeId) : null,
        pin,
      });
      if (res.error) { setError(res.error); return; }
      onClose();
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "20px", fontWeight: 500 }}>
            เพิ่มผู้ใช้ใหม่
          </h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="ปิด">×</button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="field">
            <span className="lbl">บทบาท</span>
            <select
              className="select-field"
              value={role}
              onChange={(e) => { setRole(e.target.value as typeof role); setEmployeeId(""); }}
            >
              <option value="dev">นักพัฒนา</option>
              <option value="admin">ผู้จัดการ</option>
              <option value="staff">พนักงาน</option>
            </select>
          </div>

          {needsEmployee && (
            <div className="field">
              <span className="lbl">พนักงาน</span>
              {availableEmployees.length === 0 ? (
                <p style={{ fontSize: "13px", color: "var(--muted)" }}>ไม่มีพนักงานที่ยังไม่มีบัญชี</p>
              ) : (
                <select
                  className="select-field"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">-- เลือกพนักงาน --</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <PinField label="PIN (4 หลัก)" value={pin} onChange={setPin} />
          <PinField label="ยืนยัน PIN" value={confirmPin} onChange={setConfirmPin} />
        </div>
        <div className="modal-foot">
          {error && <span style={{ marginRight: "auto", fontSize: "12px", color: "var(--danger)" }}>{error}</span>}
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>ยกเลิก</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={pending}>
            {pending ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChangePinModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  useScrollLock();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { setError("PIN ต้องเป็นตัวเลข 4 หลัก"); return; }
    if (pin !== confirmPin) { setError("PIN ไม่ตรงกัน"); return; }
    setError(null);
    startTransition(async () => {
      const res = await updatePin(user.id, pin);
      if (res.error) { setError(res.error); return; }
      onClose();
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "20px", fontWeight: 500 }}>
            เปลี่ยน PIN — {user.name}
          </h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="ปิด">×</button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <PinField label="PIN ใหม่ (4 หลัก)" value={pin} onChange={setPin} />
          <PinField label="ยืนยัน PIN ใหม่" value={confirmPin} onChange={setConfirmPin} />
        </div>
        <div className="modal-foot">
          {error && <span style={{ marginRight: "auto", fontSize: "12px", color: "var(--danger)" }}>{error}</span>}
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>ยกเลิก</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={pending}>
            {pending ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
