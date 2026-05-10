import { getEmployees, getSkills } from "@/modules/staff/server";
import { StaffView } from "@/modules/staff/client";

export default async function StaffPage() {
  const [employees, skills] = await Promise.all([getEmployees(), getSkills()]);
  return <StaffView employees={employees} skills={skills} />;
}
