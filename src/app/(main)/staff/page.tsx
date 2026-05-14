import { getEmployees, getSkills } from "@/modules/staff/server";
import { StaffView } from "@/modules/staff/client";
import { getCurrentUser } from "@/modules/auth/server";

export default async function StaffPage() {
  const user = await getCurrentUser();
  const [employees, skills] = await Promise.all([getEmployees(), getSkills()]);
  return <StaffView employees={employees} skills={skills} currentUserRole={user?.role ?? null} />;
}
