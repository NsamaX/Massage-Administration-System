"use client";

import { useState, useTransition } from "react";
import { ROLE_LABEL } from "@/modules/auth/schema";
import type { UserRow, EmployeeOption } from "../schema";
import { createUser, deleteUser, updatePin } from "../server";
import { useScrollLock } from "@/modules/core/client";

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function formatLastLogin(d: Date | null): string {
  if (!d) return "—";
  const date = new Date(d);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543} · ${hh}:${mm}`;
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

function roleTagClass(role: string) {
  if (role === "dev") return "role-tag dev";
  return "role-tag";
}

export function UsersView({
  users,
  availableEmployees,
  currentUserId,
  currentUserRole,
}: {
  users: UserRow[];
  availableEmployees: EmployeeOption[];
  currentUserId: number;
  currentUserRole: "dev" | "admin";
}) {
  const [creating, setCreating] = useState(false);
  const [changingPin, setChangingPin] = useState<UserRow | null>(null);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">07 · insight</div>
          <h1>ผู้ใช้งาน <em>ระบบ</em></h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="caps">{users.length} บัญชี</div>
        </div>
      </div>

      <div className="card">
        <div className="head">
          <h3>บัญชีผู้ใช้</h3>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setCreating(true)}
          >
            ＋ เพิ่มผู้ใช้
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: "40px" }}>#</th>
                <th>ชื่อ-สกุล</th>
                <th>บทบาท</th>
                <th>เข้าสู่ระบบล่าสุด</th>
                <th style={{ textAlign: "right" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => {
                const isCurrent = user.id === currentUserId;
                const canChangePin = currentUserRole === "dev" || isCurrent || user.role === "staff";
                return (
                  <UserRowItem
                    key={user.id}
                    user={user}
                    index={idx + 1}
                    isCurrent={isCurrent}
                    canChangePin={canChangePin}
                    onChangePin={() => setChangingPin(user)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {creating && (
        <CreateModal
          availableEmployees={availableEmployees}
          onClose={() => setCreating(false)}
        />
      )}
      {changingPin && (
        <ChangePinModal user={changingPin} onClose={() => setChangingPin(null)} />
      )}
    </>
  );
}

function UserRowItem({
  user,
  index,
  isCurrent,
  canChangePin,
  onChangePin,
}: {
  user: UserRow;
  index: number;
  isCurrent: boolean;
  canChangePin: boolean;
  onChangePin: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteUser(user.id);
      if (res.error) setError(res.error);
    });
  }

  return (
    <tr className="row-link">
      <td><span className="num">{String(index).padStart(2, "0")}</span></td>
      <td>
        <span style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{
            display: "inline-grid", placeItems: "center",
            width: "32px", height: "32px", borderRadius: "50%",
            background: "var(--ink)", color: "#faf6ee",
            fontFamily: '"Cormorant Garamond", serif',
            fontStyle: "italic", fontSize: "14px", fontWeight: 500,
            flexShrink: 0,
          }}>
            {getInitials(user.name)}
          </span>
          <span className="serif" style={{ fontSize: "17px" }}>{user.name}</span>
        </span>
      </td>
      <td>
        <span className={roleTagClass(user.role)}>{ROLE_LABEL[user.role]}</span>
      </td>
      <td style={{ fontSize: "13px", color: "var(--muted)" }}>
        {formatLastLogin(user.lastLoginAt)}
      </td>
      <td style={{ textAlign: "right" }}>
        {confirm ? (
          <span style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>ยืนยันลบ?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="btn btn-ghost btn-sm"
              style={{ color: "var(--danger)", borderColor: "#e8d4d4" }}
            >
              ลบ
            </button>
            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="btn btn-ghost btn-sm"
            >
              ยกเลิก
            </button>
          </span>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
            {canChangePin && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={onChangePin}>
                PIN
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirm(true)}
              disabled={isCurrent}
              title={isCurrent ? "ไม่สามารถลบบัญชีตัวเองได้" : undefined}
              style={{ color: "var(--danger)", borderColor: "#e8d4d4", opacity: isCurrent ? .4 : 1 }}
            >
              ลบ
            </button>
          </span>
        )}
        {error && <span style={{ display: "block", fontSize: "11px", color: "var(--danger)", marginTop: "4px" }}>{error}</span>}
      </td>
    </tr>
  );
}

function CreateModal({
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

function ChangePinModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
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
