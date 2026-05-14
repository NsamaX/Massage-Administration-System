import { getStaffWithStatus, getMassagesForAssign, getAvailableRooms } from "@/modules/appointments/server";
import { AppointmentsView } from "@/modules/appointments/client";
import { requireRole } from "@/modules/auth/server";

export default async function AppointmentsPage() {
  await requireRole(["dev", "staff"]);
  const [staffList, massages, rooms] = await Promise.all([
    getStaffWithStatus(),
    getMassagesForAssign(),
    getAvailableRooms(),
  ]);
  return <AppointmentsView staffList={staffList} massages={massages} rooms={rooms} />;
}
