"use client";

import { useState, useTransition } from "react";
import { ROLE_LABEL } from "@/modules/auth/schema";
import type { UserRow, EmployeeOption } from "../schema";
import { deleteUser } from "../server";
import { CreateModal, ChangePinModal } from "./UsersDialog";

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function formatLastLogin(d: string | null): string {
  if (!d) return "—";
  const [datePart, timePartRaw] = d.includes("T") ? d.split("T") : d.split(" ");
  if (!datePart) return "—";
  const [y, m, day] = datePart.split("-").map(Number);
  const timePart = timePartRaw?.slice(0, 5) ?? "";
  return `${day} ${THAI_MONTHS[m - 1]} ${y + 543} · ${timePart}`;
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
          <div className="crumb">๐๗ · ข้อมูลเชิงลึก</div>
          <h1>ผู้ใช้งาน <em>ระบบ</em></h1>
        </div>
        <div className="page-head-meta">
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
        <div className="table-scroll">
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
        <span className="user-name-cell">
          <span className="user-av">{getInitials(user.name)}</span>
          <span className="user-name">{user.name}</span>
        </span>
      </td>
      <td>
        <span className={roleTagClass(user.role)}>{ROLE_LABEL[user.role]}</span>
      </td>
      <td className="td-muted">
        {formatLastLogin(user.lastLoginAt)}
      </td>
      <td>
        {confirm ? (
          <span className="row-actions">
            <span className="confirm-text">ยืนยันลบ?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="btn btn-ghost-danger btn-sm"
            >
              ลบ
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="btn btn-ghost btn-sm">
              ยกเลิก
            </button>
          </span>
        ) : (
          <span className="row-actions">
            {canChangePin && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={onChangePin}>PIN</button>
            )}
            <button
              type="button"
              className="btn btn-ghost-danger btn-sm"
              onClick={() => setConfirm(true)}
              disabled={isCurrent}
              title={isCurrent ? "ไม่สามารถลบบัญชีตัวเองได้" : undefined}
            >
              ลบ
            </button>
          </span>
        )}
        {error && <span className="row-error">{error}</span>}
      </td>
    </tr>
  );
}

