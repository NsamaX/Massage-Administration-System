"use client";

import { useTransition, useState, useRef } from "react";
import { type Employee, type Skill } from "../schema";
import { createSkill, deleteSkill, toggleAttendance, updateSkill } from "../server";
import { EditModal, CreateModal } from "./StaffDialog";

const CHIP_VARIANTS = ["", " chip-sage", " chip-clay", " chip-brass"];

export function StaffView({ employees, skills }: { employees: Employee[]; skills: Skill[] }) {
  const [search, setSearch] = useState("");
  const [editingStaff, setEditingStaff] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);

  const skillNames = skills.map((s) => s.name);

  const sorted = [...employees]
    .filter((s) => s.firstName.includes(search) || s.lastName.includes(search))
    .sort((a, b) => {
      if (a.employed !== b.employed) return a.employed ? -1 : 1;
      return a.id - b.id;
    });

  return (
    <>
      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="crumb">04 · studio</div>
          <h1>พนักงาน <em>ของร้าน</em></h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="caps">พนักงาน {employees.filter((e) => e.employed).length} คน</div>
        </div>
      </div>

      {/* Skills manager */}
      <SkillsManager skills={skills} />

      {/* Staff table */}
      <div className="card section" style={{ marginTop: "36px" }}>
        <div className="head">
          <h3>รายชื่อพนักงาน</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ"
              className="input"
              style={{ width: "160px", fontSize: "13px" }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setCreating(true)}
            >
              + เพิ่มพนักงาน
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: "40px" }}>#</th>
                <th>ชื่อ</th>
                <th>นามสกุล</th>
                <th>เบอร์โทร</th>
                <th>ทักษะ</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((staff, idx) => (
                <StaffRow
                  key={staff.id}
                  staff={staff}
                  rowNum={idx + 1}
                  onEdit={() => setEditingStaff({ ...staff, skills: [...staff.skills] })}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingStaff && (
        <EditModal staff={editingStaff} allSkills={skillNames} onClose={() => setEditingStaff(null)} />
      )}
      {creating && (
        <CreateModal allSkills={skillNames} onClose={() => setCreating(false)} />
      )}
    </>
  );
}

function StaffRow({ staff, rowNum, onEdit }: { staff: Employee; rowNum: number; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [rowError, setRowError] = useState<string | null>(null);

  function handleToggle() {
    setRowError(null);
    startTransition(async () => {
      const res = await toggleAttendance(staff.id);
      if (res.error) setRowError(res.error);
    });
  }

  return (
    <tr className="row-link" style={!staff.employed ? { opacity: .55 } : undefined}>
      <td><span className="num">{String(rowNum).padStart(2, "0")}</span></td>
      <td>{staff.firstName}</td>
      <td>{staff.lastName}</td>
      <td className="mono" style={{ fontSize: "11.5px", color: "var(--muted)" }}>{staff.phone}</td>
      <td>
        <div style={{ display: "flex", flexWrap: "nowrap", gap: "4px" }}>
          {staff.skills.map((s, i) => (
            <span key={s} className={`chip${CHIP_VARIANTS[i % 4]}`}>
              <span className="dot" />{s}
            </span>
          ))}
        </div>
      </td>
      <td>
        {staff.employed ? (
          <button
            type="button"
            className={`status${staff.present ? "" : " off"}`}
            onClick={handleToggle}
            disabled={pending}
            style={{ cursor: "pointer", background: "none", border: "none" }}
          >
            <span className="d" />
            {staff.present ? "มาทำงาน" : "ไม่มาทำงาน"}
          </button>
        ) : (
          <span className="status off"><span className="d" />ลาออก</span>
        )}
        {rowError && <div style={{ fontSize: "10px", color: "var(--danger)" }}>{rowError}</div>}
      </td>
      <td style={{ textAlign: "right" }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>แก้ไข</button>
      </td>
    </tr>
  );
}

function SkillsManager({ skills }: { skills: Skill[] }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  function handleStartEdit(skill: Skill) {
    setEditingId(skill.id);
    setEditingName(skill.name);
    setError(null);
  }

  function handleSaveEdit() {
    if (!editingName.trim() || editingId === null) return;
    setError(null);
    startTransition(async () => {
      const res = await updateSkill(editingId, editingName);
      if (res.error) { setError(res.error); return; }
      setEditingId(null);
    });
  }

  function handleDelete(id: number) {
    setError(null);
    startTransition(async () => {
      const res = await deleteSkill(id);
      if (res.error) setError(res.error);
    });
  }

  function handleCreate() {
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await createSkill(newName);
      if (res.error) { setError(res.error); return; }
      setNewName("");
      newInputRef.current?.focus();
    });
  }

  return (
    <div className="card section">
      <div className="head">
        <h3>จัดการทักษะ <em className="serif-it" style={{ color: "var(--umber)", fontSize: "14px" }}></em></h3>
        <span className="caps">{skills.length} ทักษะ</span>
      </div>
      <div className="body">
        <div className="skill-pad">
          {skills.map((skill, i) => (
            editingId === skill.id ? (
              <span key={skill.id} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                  className="input"
                  style={{ width: "120px", fontSize: "13px" }}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveEdit}
                  disabled={pending}
                >✓</button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditingId(null)}
                >×</button>
              </span>
            ) : (
              <span key={skill.id} className={`chip chip-edit${CHIP_VARIANTS[i % 4]}`}>
                <span className="dot" />
                {skill.name}
                <button
                  type="button"
                  style={{ background: "none", border: "none", display: "inline-flex", alignItems: "center", marginLeft: "2px", color: "var(--faint)", cursor: "pointer", fontSize: "11px" }}
                  onClick={() => handleStartEdit(skill)}
                  title="แก้ไข"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 8L8 2M5.5 2H8v2.5" stroke="currentColor" strokeWidth="1" /></svg>
                </button>
                <span
                  className="x"
                  onClick={() => handleDelete(skill.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleDelete(skill.id)}
                >×</span>
              </span>
            )
          ))}
        </div>

        <div className="skill-add-row">
          <input
            ref={newInputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="เพิ่มชื่อทักษะใหม่…"
            className="input"
            style={{ maxWidth: "240px" }}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleCreate}
            disabled={pending || !newName.trim()}
          >
            ＋ เพิ่มทักษะ
          </button>
        </div>
        {error && <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--danger)" }}>{error}</p>}
      </div>
    </div>
  );
}

