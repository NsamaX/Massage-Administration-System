"use client";

import { useTransition, useState } from "react";
import { type Employee } from "../schema";
import { toggleAttendance } from "../server";
import { StaffFormModal } from "./StaffDialog";

const CHIP_VARIANTS = ["", " chip-sage", " chip-clay", " chip-brass"];
const PAGE_SIZE = 20;

type Props = {
  employees: Employee[];
  skillNames: string[];
  canManageStaffData: boolean;
  canToggleAttendance: boolean;
};

export function StaffTable({ employees, skillNames, canManageStaffData, canToggleAttendance }: Props) {
  const [search, setSearch] = useState("");
  const [editingStaff, setEditingStaff] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);

  const sorted = [...employees]
    .filter((s) => s.firstName.includes(search) || s.lastName.includes(search))
    .sort((a, b) => {
      if (a.employed !== b.employed) return a.employed ? -1 : 1;
      return a.id - b.id;
    });

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="card section">
        <div className="head">
          <h3>รายชื่อพนักงาน</h3>
          <div className="head-actions">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="ค้นหาชื่อ"
              className="input"
              style={{ width: "160px", fontSize: "13px" }}
            />
            {canManageStaffData && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setCreating(true)}
              >
                + เพิ่มพนักงาน
              </button>
            )}
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: "40px" }}>#</th>
                <th style={{ width: "74px" }}>รหัส</th>
                <th>ชื่อ</th>
                <th>นามสกุล</th>
                <th>เบอร์โทร</th>
                <th>ทักษะ</th>
                <th>สถานะ</th>
                {canManageStaffData && <th>จัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {paged.map((staff, idx) => (
                <StaffRow
                  key={staff.id}
                  staff={staff}
                  rowNum={(page - 1) * PAGE_SIZE + idx + 1}
                  canManageStaffData={canManageStaffData}
                  canToggleAttendance={canToggleAttendance}
                  onEdit={() => setEditingStaff({ ...staff, skills: [...staff.skills] })}
                />
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={canManageStaffData ? 8 : 7} style={{ textAlign: "center", padding: "32px", color: "var(--muted)", fontSize: "13px" }}>
                    {employees.length === 0
                      ? canManageStaffData
                        ? "ยังไม่มีพนักงาน — กด '+ เพิ่มพนักงาน' เพื่อเริ่มต้น"
                        : "ยังไม่มีพนักงาน"
                      : `ไม่พบ "${search}"`
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pageCount > 1 && (
        <div className="pagination" style={{ paddingBottom: "4px" }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← ก่อนหน้า
          </button>
          <span className="pg-info">หน้า {page} / {pageCount}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            ถัดไป →
          </button>
        </div>
      )}

      {canManageStaffData && editingStaff && (
        <StaffFormModal staff={editingStaff} allSkills={skillNames} onClose={() => setEditingStaff(null)} />
      )}
      {canManageStaffData && creating && (
        <StaffFormModal allSkills={skillNames} onClose={() => setCreating(false)} />
      )}
    </>
  );
}

function StaffRow({
  staff, rowNum, canManageStaffData, canToggleAttendance, onEdit,
}: {
  staff: Employee;
  rowNum: number;
  canManageStaffData: boolean;
  canToggleAttendance: boolean;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [rowError, setRowError] = useState<string | null>(null);

  function handleToggle() {
    if (!canToggleAttendance) return;
    setRowError(null);
    startTransition(async () => {
      const res = await toggleAttendance(staff.id);
      if (res.error) setRowError(res.error);
    });
  }

  return (
    <tr className="row-link" style={!staff.employed ? { opacity: .55 } : undefined}>
      <td><span className="num">{String(rowNum).padStart(2, "0")}</span></td>
      <td className="mono">{staff.employeeCode ?? "—"}</td>
      <td>{staff.firstName}</td>
      <td>{staff.lastName}</td>
      <td className="mono">{staff.phone}</td>
      <td>
        <div className="chips-nowrap">
          {staff.skills.map((s, i) => (
            <span key={s} className={`chip${CHIP_VARIANTS[i % 4]}`}>
              <span className="dot" />{s}
            </span>
          ))}
        </div>
      </td>
      <td>
        {staff.employed ? (
          canToggleAttendance ? (
            <button
              type="button"
              className={`status${staff.present ? "" : " off"}`}
              onClick={handleToggle}
              disabled={pending}
                >
              <span className="d" />
              {staff.present ? "มาทำงาน" : "ไม่มาทำงาน"}
            </button>
          ) : (
            <span className={`status${staff.present ? "" : " off"}`}>
              <span className="d" />
              {staff.present ? "มาทำงาน" : "ไม่มาทำงาน"}
            </span>
          )
        ) : (
          <span className="status off"><span className="d" />เลิกจ้าง</span>
        )}
        {rowError && <div className="row-error">{rowError}</div>}
      </td>
      {canManageStaffData && (
        <td style={{ textAlign: "right" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>แก้ไข</button>
        </td>
      )}
    </tr>
  );
}
