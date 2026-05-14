"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignAppointmentsGroup } from "../server";
import type { MassageOption, RoomOption, StaffStatus } from "../schema";
import { useScrollLock } from "@/modules/core/client";

type Props = {
  open: boolean;
  onClose: () => void;
  staff: StaffStatus | null;
  staffList: StaffStatus[];
  massages: MassageOption[];
  rooms: RoomOption[];
};

export function AssignDialog({ open, onClose, staff, staffList, massages, rooms }: Props) {
  const [selectedMassageId, setSelectedMassageId] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>(() => (staff ? [staff.id] : []));
  const [staffQuery, setStaffQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [skillFilter, setSkillFilter] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const closeOnClick = useRef(false);
  const filterWrapRef = useRef<HTMLDivElement>(null);
  const filterDropRef = useRef<HTMLDivElement>(null);
  const DROPDOWN_HEIGHT = 205; // ~5 items × 41px

  useScrollLock(open && !!staff);

  const assignableStaff = useMemo(() => {
    const allow = staffList.filter((s) => s.status === "available");
    return allow.sort((a, b) => a.name.localeCompare(b.name));
  }, [staffList]);

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    for (const s of assignableStaff) for (const skill of s.skills) set.add(skill);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [assignableStaff]);

  const filteredStaff = useMemo(() => {
    const q = staffQuery.trim().toLowerCase();
    const qDigits = q.replace(/[^\d]/g, "");

    return assignableStaff.filter((s) => {
      const matchQuery =
        q.length === 0
          ? true
          : s.name.toLowerCase().includes(q) ||
            (qDigits.length > 0 && (s.employeeCode ?? "").includes(qDigits));

      const matchSkill =
        skillFilter.length === 0 ? true : s.skills.some((sk) => skillFilter.includes(sk));

      return matchQuery && matchSkill;
    });
  }, [assignableStaff, skillFilter, staffQuery]);

  function handleClose() {
    setSelectedMassageId(null);
    setSelectedDuration(null);
    setSelectedRoomId(null);
    setSelectedStaffIds([]);
    setStaffQuery("");
    setSkillFilter([]);
    setFilterOpen(false);
    setError(null);
    onClose();
  }

  useEffect(() => {
    if (!filterOpen) return;

    function onPointerDown(e: PointerEvent) {
      const wrap = filterWrapRef.current;
      if (!wrap) return;
      if (!wrap.contains(e.target as Node)) setFilterOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setFilterOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [filterOpen]);

  function handleAssign() {
    if (!selectedMassageId || !selectedRoomId || selectedStaffIds.length === 0) return;
    setError(null);
    startTransition(async () => {
      const selectedMassage = massages.find((m) => m.id === selectedMassageId);
      const effectiveDuration = selectedDuration ?? selectedMassage?.duration ?? undefined;
      const res = await assignAppointmentsGroup(selectedStaffIds, selectedMassageId, selectedRoomId, effectiveDuration);
      if (res.error) { setError(res.error); return; }
      router.refresh();
      handleClose();
    });
  }

  if (!open || !staff) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => { closeOnClick.current = e.target === e.currentTarget; }}
      onClick={() => { if (closeOnClick.current) handleClose(); }}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>มอบหมายงาน</h3>
          <button type="button" className="modal-close" onClick={handleClose} aria-label="ปิด">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="form-stack">
            <div className="field">
              <span className="lbl">
                พนักงาน <em>{selectedStaffIds.length} คน</em>
              </span>
              <div className="head-actions">
                <input
                  className="input"
                  value={staffQuery}
                  onChange={(e) => setStaffQuery(e.target.value)}
                  placeholder="ค้นหาชื่อหรือรหัส…"
                />
                <div ref={filterWrapRef} className="filter-wrap">
                  <button
                    type="button"
                    className={`btn-icon${skillFilter.length > 0 ? " active" : ""}`}
                    onClick={() => {
                      setFilterOpen((v) => !v);
                      requestAnimationFrame(() => {
                        const dropdown = filterDropRef.current;
                        const modal = filterWrapRef.current?.closest(".modal");
                        const modalBody = filterWrapRef.current?.closest(".modal-body");
                        if (!dropdown || !modalBody) return;
                        const modalBottom = modal ? modal.getBoundingClientRect().bottom - 8 : window.innerHeight - 8;
                        const dropBottom = dropdown.getBoundingClientRect().bottom;
                        if (dropBottom > modalBottom) modalBody.scrollTop += dropBottom - modalBottom;
                      });
                    }}
                    title="กรองทักษะ"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 3h10M4 7h6M6 11h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </button>
                  {filterOpen && (
                    <div
                      ref={filterDropRef}
                      className="filter-dropdown"
                      style={{ minWidth: "220px", maxHeight: DROPDOWN_HEIGHT, overflowY: "auto", overscrollBehavior: "contain" }}
                    >
                      <button
                        type="button"
                        className={`filter-item${skillFilter.length === 0 ? " active" : ""}`}
                        onClick={() => { setSkillFilter([]); setFilterOpen(false); }}
                      >
                        ทั้งหมด
                      </button>
                      {allSkills.map((skill) => {
                        const active = skillFilter.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            className={`filter-item${active ? " active" : ""}`}
                            onClick={() => {
                              setSkillFilter((prev) => (
                                prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
                              ));
                            }}
                          >
                            {active ? `✓ ${skill}` : skill}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="staff-checklist">
                {filteredStaff.map((s) => {
                  const checked = selectedStaffIds.includes(s.id);
                  return (
                    <label key={s.id} className="check-row">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const nextChecked = e.target.checked;
                          setSelectedStaffIds((prev) => {
                            if (nextChecked) return Array.from(new Set([...prev, s.id]));
                            const next = prev.filter((id) => id !== s.id);
                            return next.length === 0 ? [staff.id] : next;
                          });
                        }}
                      />
                      <div className="check-info">
                        <div className="check-name">{s.name}</div>
                        <div className="check-code">{s.employeeCode ?? "—"}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="field">
              <span className="lbl">แผนนวด</span>
              <select
                className="select-field"
                value={selectedMassageId ?? ""}
                onChange={(e) => {
                  setSelectedMassageId(e.target.value ? Number(e.target.value) : null);
                  setSelectedDuration(null);
                }}
              >
                <option value="">เลือกแผนนวด…</option>
                {massages.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              {(() => {
                const m = massages.find((m) => m.id === selectedMassageId);
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
              <span className="lbl">ห้อง</span>
              <select
                className="select-field"
                value={selectedRoomId ?? ""}
                onChange={(e) => setSelectedRoomId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">เลือกห้อง…</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="modal-foot">
          {error && <span className="form-error">{error}</span>}
          <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={pending}>
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAssign}
            disabled={!selectedMassageId || !selectedRoomId || selectedStaffIds.length === 0 || pending}
          >
            {pending ? "กำลังบันทึก..." : "มอบหมาย"}
          </button>
        </div>
      </div>
    </div>
  );
}
