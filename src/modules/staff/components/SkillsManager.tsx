"use client";

import { useTransition, useState, useRef } from "react";
import { type Skill } from "../schema";
import { createSkill, deleteSkill, updateSkill } from "../server";

const CHIP_VARIANTS = ["", " chip-sage", " chip-clay", " chip-brass"];

export function SkillsManager({ skills }: { skills: Skill[] }) {
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
              <span key={skill.id} className="skill-edit-row">
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
                <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveEdit} disabled={pending}>✓</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>×</button>
              </span>
            ) : (
              <span key={skill.id} className={`chip chip-edit${CHIP_VARIANTS[i % 4]}`}>
                <span className="dot" />
                {skill.name}
                <button
                  type="button"
                  className="chip-edit-btn"
                  onClick={() => handleStartEdit(skill)}
                  title="แก้ไข"
                >
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
        {error && <p className="form-error" style={{ marginTop: "8px" }}>{error}</p>}
      </div>
    </div>
  );
}
