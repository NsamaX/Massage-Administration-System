"use client";

import { useTransition, useState } from "react";
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

export function AppointmentsView({ staffList, massages, rooms }: Props) {
  const [dialogStaff, setDialogStaff] = useState<StaffStatus | null>(null);
  const available = staffList.filter((s) => s.status === "available").length;

  return (
    <>
      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="crumb">02 · workspace</div>
          <h1>นัดหมาย <em>วันนี้</em></h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="caps">พนักงาน {staffList.length} · พร้อม {available}</div>
        </div>
      </div>

      <div className="staff-grid">
        {staffList.map((staff) => (
          <StaffCard
            key={staff.id}
            staff={staff}
            onAssign={() => setDialogStaff(staff)}
          />
        ))}
      </div>

      <AssignDialog
        open={dialogStaff !== null}
        staff={dialogStaff}
        massages={massages}
        rooms={rooms}
        onClose={() => setDialogStaff(null)}
      />
    </>
  );
}

function StaffCard({ staff, onAssign }: { staff: StaffStatus; onAssign: () => void }) {
  const [pending, startTransition] = useTransition();
  const [cardError, setCardError] = useState<string | null>(null);
  const absent = staff.status === "absent";
  const working = staff.status === "working";

  function handleComplete() {
    setCardError(null);
    startTransition(async () => {
      const res = await completeAppointment(staff.id);
      if (res.error) setCardError(res.error);
    });
  }

  return (
    <div className={`staff-card${absent ? " off" : working ? " busy" : ""}`}>
      <span className="badge">
        <span className="d" />
        {working ? "ในห้อง" : absent ? "ไม่มาทำงาน" : "พร้อม"}
      </span>

      <div className="av">
        {staff.imageUrl ? (
          <img src={staff.imageUrl} alt={staff.name} />
        ) : (
          getInitials(staff.name)
        )}
      </div>

      <div className="nm">{staff.name}</div>
      {staff.phone && <div className="ph">{staff.phone}</div>}

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
            className="btn btn-ghost btn-md"
            disabled={pending}
            onClick={handleComplete}
            style={{ flex: 1, justifyContent: "center" }}
          >
            {pending ? "กำลังบันทึก..." : "เสร็จสิ้น"}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-md"
            disabled={absent}
            onClick={onAssign}
          >
            มอบหมายงาน
          </button>
        )}
      </div>
      {cardError && (
        <p style={{ marginTop: "8px", fontSize: "11.5px", color: "var(--danger)", textAlign: "center" }}>
          {cardError}
        </p>
      )}
    </div>
  );
}
