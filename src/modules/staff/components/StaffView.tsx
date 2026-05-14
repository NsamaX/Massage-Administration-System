"use client";

import { type Employee, type Skill } from "../schema";
import { SkillsManager } from "./SkillsManager";
import { StaffTable } from "./StaffTable";

type Role = "dev" | "admin" | "staff" | null;

export function StaffView({
  employees,
  skills,
  currentUserRole,
}: {
  employees: Employee[];
  skills: Skill[];
  currentUserRole: Role;
}) {
  const canManageStaffData = currentUserRole === "dev" || currentUserRole === "admin";
  const canToggleAttendance = canManageStaffData || currentUserRole === "staff";
  const skillNames = skills.map((s) => s.name);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">๐๔ · สตูดิโอ</div>
          <h1>พนักงาน <em>ของร้าน</em></h1>
        </div>
        <div className="page-head-meta">
          <div className="caps">พนักงาน {employees.filter((e) => e.employed).length} คน</div>
        </div>
      </div>

      {canManageStaffData && <SkillsManager skills={skills} />}

      <StaffTable
        employees={employees}
        skillNames={skillNames}
        canManageStaffData={canManageStaffData}
        canToggleAttendance={canToggleAttendance}
      />
    </>
  );
}
