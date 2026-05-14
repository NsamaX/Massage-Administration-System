"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPayroll, getAllStaffWorkDetails, getDailyServiceHistory, getReportData, getServiceWorkHistory, getStaffWorkHistory } from "../server";
import type { PayrollPeriod, ReportData, SalaryRow, StaffWorkEntry } from "../schema";
import { exportDetailedCSV, formatDateThai, formatPeriodShort, getDayDate } from "./report-utils";
import { BarChartCard } from "./BarChartCard";
import { PayrollSummaryCard } from "./PayrollSummaryCard";
import { ServicePopularityCard } from "./ServicePopularityCard";
import { PayrollHistoryCard } from "./PayrollHistoryCard";
import { WorkHistoryPanel } from "./WorkHistoryPanel";

type Props = {
  initialStartDate: string;
  initialEndDate: string;
  initialData: ReportData;
  payrollHistory: PayrollPeriod[];
};

export function ReportView({ initialStartDate, initialEndDate, initialData, payrollHistory }: Props) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [data, setData] = useState<ReportData>(initialData);
  const [pending, startTransition] = useTransition();

  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);
  const [dailyHistory, setDailyHistory] = useState<StaffWorkEntry[]>([]);
  const [dailyHistoryPending, startDailyHistoryTransition] = useTransition();

  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState<string | null>(null);
  const [staffWork, setStaffWork] = useState<StaffWorkEntry[]>([]);
  const [workPending, startWorkTransition] = useTransition();

  const [selectedServiceName, setSelectedServiceName] = useState<string | null>(null);
  const [serviceWork, setServiceWork] = useState<StaffWorkEntry[]>([]);
  const [serviceWorkPending, startServiceWorkTransition] = useTransition();

  const [exportPending, startExportTransition] = useTransition();

  function clearStaffWork() { setSelectedStaffId(null); setSelectedStaffName(null); setStaffWork([]); }
  function clearServiceWork() { setSelectedServiceName(null); setServiceWork([]); }
  function clearDailyHistory() { setSelectedBarIdx(null); setDailyHistory([]); }

  function handleBarSelect(idx: number | null) {
    if (idx === null || idx === selectedBarIdx) { clearDailyHistory(); return; }
    setSelectedBarIdx(idx);
    clearStaffWork();
    clearServiceWork();
    const date = getDayDate(startDate, idx);
    startDailyHistoryTransition(async () => {
      const entries = await getDailyServiceHistory(date);
      setDailyHistory(entries);
    });
  }

  function handleStaffClick(row: SalaryRow) {
    if (selectedStaffId === row.id) { clearStaffWork(); return; }
    setSelectedStaffId(row.id);
    setSelectedStaffName(`${row.firstName} ${row.lastName}`);
    clearServiceWork();
    clearDailyHistory();
    startWorkTransition(async () => {
      const entries = await getStaffWorkHistory(row.id, startDate, endDate);
      setStaffWork(entries);
    });
  }

  function handleServiceClick(name: string) {
    if (selectedServiceName === name) { clearServiceWork(); return; }
    setSelectedServiceName(name);
    clearStaffWork();
    clearDailyHistory();
    startServiceWorkTransition(async () => {
      const entries = await getServiceWorkHistory(name, startDate, endDate);
      setServiceWork(entries);
    });
  }

  function handleApply(newStart: string, newEnd: string) {
    setStartDate(newStart);
    setEndDate(newEnd);
    setSelectedBarIdx(null);
    setDailyHistory([]);
    clearStaffWork();
    clearServiceWork();
    startTransition(async () => {
      const newData = await getReportData(newStart, newEnd);
      setData(newData);
    });
  }

  function handleHistoryClick(h: PayrollPeriod) {
    const [hStart, hEnd] = h.key.split("_");
    setStartDate(hStart);
    setEndDate(hEnd);
    setSelectedBarIdx(null);
    setDailyHistory([]);
    clearStaffWork();
    clearServiceWork();
    startTransition(async () => {
      const newData = await getReportData(hStart, hEnd);
      setData(newData);
    });
  }

  function handleCreatePayroll() {
    startTransition(async () => {
      await createPayroll(startDate, endDate);
      router.refresh();
    });
  }

  function handleExportDetailed() {
    startExportTransition(async () => {
      const entries = await getAllStaffWorkDetails(startDate, endDate);
      exportDetailedCSV(entries, startDate, endDate);
    });
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">๐๖ · ข้อมูลเชิงลึก</div>
          <h1>รายงาน <em>การดำเนินงาน</em></h1>
        </div>
        <div className="page-head-meta">
          <div className="caps">ช่วงรายงาน {formatPeriodShort(startDate, endDate)}</div>
        </div>
      </div>

      <div className="reports-grid" style={{ opacity: pending ? .6 : 1, transition: "opacity .2s" }}>
        <BarChartCard
          counts={data.dailyCounts}
          dailyRevenue={data.dailyRevenue}
          startDate={startDate}
          endDate={endDate}
          selectedBarIdx={selectedBarIdx}
          onBarSelect={handleBarSelect}
        />
        <PayrollSummaryCard
          startDate={startDate}
          endDate={endDate}
          salaryRows={data.salaryRows}
          payrollHistory={payrollHistory}
          pending={pending}
          selectedStaffId={selectedStaffId}
          exportPending={exportPending}
          onApply={handleApply}
          onStaffClick={handleStaffClick}
          onCreatePayroll={handleCreatePayroll}
          onExportDetailed={handleExportDetailed}
        />
        <ServicePopularityCard
          items={data.servicePopularity}
          selectedServiceName={selectedServiceName}
          onServiceClick={handleServiceClick}
        />
        <PayrollHistoryCard
          payrollHistory={payrollHistory}
          startDate={startDate}
          endDate={endDate}
          onHistoryClick={handleHistoryClick}
        />
      </div>

      {selectedBarIdx !== null && (
        <WorkHistoryPanel
          heading="ประวัติการให้บริการ"
          subtitle={formatDateThai(getDayDate(startDate, selectedBarIdx))}
          entries={dailyHistory}
          pending={dailyHistoryPending}
          showServiceCol
          emptyMessage="ไม่มีรายการในวันนี้"
        />
      )}

      {selectedServiceName !== null && (
        <WorkHistoryPanel
          heading="ประวัติการทำงาน"
          subtitle={selectedServiceName}
          entries={serviceWork}
          pending={serviceWorkPending}
          showDateCol
        />
      )}

      {selectedStaffId !== null && (
        <WorkHistoryPanel
          heading="ประวัติการทำงาน"
          subtitle={selectedStaffName!}
          entries={staffWork}
          pending={workPending}
          showServiceCol
          showDateCol
        />
      )}
    </>
  );
}
