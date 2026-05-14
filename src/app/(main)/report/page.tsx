import { getReportData, getPayrollHistory } from "@/modules/report/server";
import { ReportView } from "@/modules/report/client";
import { requireRole } from "@/modules/auth/server";

function getDefaultPeriod() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return { start: `${y}-${m}-01`, end: `${y}-${m}-${d}` };
}

export default async function ReportPage() {
  await requireRole(["dev", "admin"]);
  const { start, end } = getDefaultPeriod();
  const [reportData, payrollHistory] = await Promise.all([
    getReportData(start, end),
    getPayrollHistory(),
  ]);
  return (
    <ReportView
      initialStartDate={start}
      initialEndDate={end}
      initialData={reportData}
      payrollHistory={payrollHistory}
    />
  );
}
