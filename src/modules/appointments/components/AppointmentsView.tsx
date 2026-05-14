"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AssignDialog } from "./AssignDialog";
import { completeAppointment } from "../server";
import type { MassageOption, RoomOption, StaffStatus } from "../schema";

type Props = {
  staffList: StaffStatus[];
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

const PAGE_SIZE = 20;

export function AppointmentsView({ staffList, massages, rooms }: Props) {
  const [dialogStaff, setDialogStaff] = useState<StaffStatus | null>(null);
  const [staffQuery, setStaffQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [skillFilter, setSkillFilter] = useState<string[]>([]);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);
  const [page, setPage] = useState(1);

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    for (const s of staffList) for (const sk of s.skills) set.add(sk);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [staffList]);

  const filteredStaffList = useMemo(() => {
    const q = staffQuery.trim().toLowerCase();
    const qDigits = q.replace(/[^\d]/g, "");

    return staffList.filter((s) => {
      const matchQuery =
        q.length === 0
          ? true
          : s.name.toLowerCase().includes(q) ||
            (qDigits.length > 0 && (s.employeeCode ?? "").includes(qDigits));

      const matchSkill =
        skillFilter.length === 0 ? true : s.skills.some((sk) => skillFilter.includes(sk));

      return matchQuery && matchSkill;
    });
  }, [skillFilter, staffList, staffQuery]);

  const visibleStaff = useMemo(() => {
    return showOnlyAvailable
      ? filteredStaffList.filter((s) => s.status === "available")
      : filteredStaffList;
  }, [filteredStaffList, showOnlyAvailable]);

  const pageCount = Math.max(1, Math.ceil(visibleStaff.length / PAGE_SIZE));
  const pagedStaff = useMemo(
    () => visibleStaff.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visibleStaff, page],
  );

  const workingRoomCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of staffList) {
      if (s.status !== "working") continue;
      if (s.workingRoomNumber === null) continue;
      map.set(s.workingRoomNumber, (map.get(s.workingRoomNumber) ?? 0) + 1);
    }
    return map;
  }, [staffList]);

  const available = filteredStaffList.filter((s) => s.status === "available").length;

  return (
    <>
      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="crumb">๐๒ · พื้นที่ทำงาน</div>
          <h1>นัดหมาย <em>วันนี้</em></h1>
        </div>
        <div className="page-head-meta">
          <div className="caps">พนักงาน {staffList.length} · พร้อม {available}</div>
          <div className="head-actions">
            <input
              className="input"
              value={staffQuery}
              onChange={(e) => { setStaffQuery(e.target.value); setPage(1); }}
              placeholder="ค้นหาชื่อหรือรหัส…"
              style={{ width: "200px" }}
            />
            <button
              type="button"
              className={`btn-icon${showOnlyAvailable ? " ok" : ""}`}
              onClick={() => { setShowOnlyAvailable((v) => !v); setPage(1); }}
              title={showOnlyAvailable ? "แสดงเฉพาะพร้อม" : "แสดงทั้งหมด"}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <circle cx="7" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
            <div className="filter-wrap">
              {filterOpen && (
                <div className="overlay-dismiss" onClick={() => setFilterOpen(false)} />
              )}
              <button
                type="button"
                className={`btn-icon${skillFilter.length > 0 ? " active" : ""}`}
                onClick={() => setFilterOpen((v) => !v)}
                title="กรองทักษะ"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 3h10M4 7h6M6 11h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
              {filterOpen && (
                <div className="filter-dropdown" style={{ minWidth: "220px" }}>
                  <button
                    type="button"
                    className={`filter-item${skillFilter.length === 0 ? " active" : ""}`}
                    onClick={() => { setSkillFilter([]); setFilterOpen(false); setPage(1); }}
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
                          setPage(1);
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
        </div>
      </div>

      <div className="staff-grid">
        {pagedStaff.map((staff) => (
          <StaffCard
            key={staff.id}
            staff={staff}
            groupSize={staff.workingRoomNumber !== null ? (workingRoomCounts.get(staff.workingRoomNumber) ?? 1) : null}
            onAssign={() => setDialogStaff(staff)}
          />
        ))}
      </div>

      {pagedStaff.length === 0 && (
        <div className="history-empty">
          <p>
            {staffList.length === 0
              ? <>ยังไม่มีพนักงานในระบบ — เพิ่มได้ที่เมนู <strong>พนักงาน</strong></>
              : showOnlyAvailable
                ? <>ไม่มีพนักงานที่พร้อมรับงาน — กดไอคอน <strong>ดวงตา</strong> เพื่อดูทั้งหมด</>
                : "ไม่พบพนักงานที่ตรงกับการค้นหา"
            }
          </p>
        </div>
      )}

      {pageCount > 1 && (
        <div className="pagination">
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

      <AssignDialog
        key={dialogStaff?.id ?? "closed"}
        open={dialogStaff !== null}
        staff={dialogStaff}
        staffList={staffList}
        massages={massages}
        rooms={rooms}
        onClose={() => setDialogStaff(null)}
      />
    </>
  );
}

function StaffCard({ staff, groupSize, onAssign }: { staff: StaffStatus; groupSize: number | null; onAssign: () => void }) {
  const [pending, startTransition] = useTransition();
  const [cardError, setCardError] = useState<string | null>(null);
  const router = useRouter();
  const absent = staff.status === "absent";
  const working = staff.status === "working";
  const badgeLabel = working
    ? staff.workingRoomNumber !== null
      ? `ห้อง ${staff.workingRoomNumber}${groupSize && groupSize > 1 ? ` · ${groupSize} คน` : ""}`
      : "กำลังทำงาน"
    : absent
      ? "ไม่มาทำงาน"
      : "พร้อม";

  function handleComplete() {
    setCardError(null);
    startTransition(async () => {
      const res = await completeAppointment(staff.id);
      if (res.error) {
        setCardError(res.error);
      } else {
        router.refresh(); 
      }
    });
  }

  return (
    <div className={`staff-card${absent ? " off" : working ? " busy" : ""}`}>
      <span className="badge">
        <span className="d" />
        {badgeLabel}
      </span>

      <div className="av">
        {staff.imageUrl ? (
          <img src={staff.imageUrl} alt={staff.name} />
        ) : (
          getInitials(staff.name)
        )}
      </div>

      <div className="nm">{staff.name}</div>
      <div className="ph">{staff.employeeCode ?? "—"}</div>

      <div className="skills">
        {staff.skills.map((skill) => (
          <span key={skill} className="chip">
            <span className="dot" />
            {skill}
          </span>
        ))}
      </div>

      <div className="actions">
        {working ? (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending}
            onClick={handleComplete}
          >
            {pending ? "กำลังบันทึก..." : "เสร็จสิ้น"}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={absent}
            onClick={onAssign}
          >
            มอบหมายงาน
          </button>
        )}
      </div>
      {cardError && <p className="card-error">{cardError}</p>}
    </div>
  );
}
