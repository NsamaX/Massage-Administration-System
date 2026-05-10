import { getStaffWithStatus, getMassagesForAssign, getAvailableRooms } from "@/modules/appointments/server";
import { AppointmentsView } from "@/modules/appointments/client";

export default async function AppointmentsPage() {
  const [staffList, massages, rooms] = await Promise.all([
    getStaffWithStatus(),
    getMassagesForAssign(),
    getAvailableRooms(),
  ]);
  return <AppointmentsView staffList={staffList} massages={massages} rooms={rooms} />;
}
