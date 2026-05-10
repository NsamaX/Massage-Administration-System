import { getDashboardData } from "@/modules/dashboard/server";
import { DashboardView } from "@/modules/dashboard/client";

export default async function DashboardPage() {
  const { stats, rooms, history, activeDates } = await getDashboardData();
  return <DashboardView stats={stats} rooms={rooms} initialHistory={history} activeDates={activeDates} />;
}
