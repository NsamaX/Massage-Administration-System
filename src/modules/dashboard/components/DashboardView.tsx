"use client";

import { useState, useTransition } from "react";
import { getHistoryByDate } from "../server";
import type { DashboardStats, HistoryEntry, RoomState } from "../schema";
import { FULL_DAYS_TH, MONTHS_TH, toDateKey } from "./dashboard-utils";
import { StatGrid } from "./StatGrid";
import { RoomGrid } from "./RoomGrid";
import { RoomPanel } from "./RoomPanel";
import { DashboardCalendar } from "./DashboardCalendar";
import { ServiceHistoryTable } from "./ServiceHistoryTable";

type Props = {
  stats: DashboardStats;
  rooms: RoomState[];
  initialHistory: HistoryEntry[];
  activeDates: string[];
};

export function DashboardView({ stats, rooms, initialHistory, activeDates }: Props) {
  const TODAY = new Date();
  const todayKey = toDateKey(TODAY);

  const [selectedDate, setSelectedDate] = useState<Date>(TODAY);
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const [historyPending, startHistoryTransition] = useTransition();
  const selectedKey = toDateKey(selectedDate);
  const isToday = selectedKey === todayKey;
  const historyLabel = isToday
    ? "บันทึกของวันนี้"
    : `${selectedDate.getDate()} ${MONTHS_TH[selectedDate.getMonth()]} ${selectedDate.getFullYear() + 543}`;

  function handleSelectDate(date: Date) {
    const key = toDateKey(date);
    setSelectedDate(date);
    startHistoryTransition(async () => {
      const rows = await getHistoryByDate(key);
      setHistory(rows);
    });
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">๐๑ · พื้นที่ทำงาน</div>
          <h1>ภาพรวม<em> วันนี้</em></h1>
        </div>
        <div className="page-head-meta">
          <div className="caps">
            {FULL_DAYS_TH[TODAY.getDay()]}ที่ {TODAY.getDate()} {MONTHS_TH[TODAY.getMonth()]} {(TODAY.getFullYear() + 543)}
          </div>
        </div>
      </div>

      <StatGrid stats={stats} />

      <div className="section">
        <div className="dash-grid">
          <RoomGrid rooms={rooms} />
          <div>
            <RoomPanel room={null} onClose={() => {}} />
            <DashboardCalendar
              selectedKey={selectedKey}
              todayKey={todayKey}
              activeDates={activeDates}
              onSelectDate={handleSelectDate}
            />
          </div>
        </div>
      </div>

      <ServiceHistoryTable
        history={history}
        pending={historyPending}
        historyLabel={historyLabel}
      />
    </>
  );
}
