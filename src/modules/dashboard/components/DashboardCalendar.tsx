"use client";

import { useState } from "react";
import { DAYS_TH, MONTHS_TH, toThai } from "./dashboard-utils";

type Props = {
  selectedKey: string;
  todayKey: string;
  activeDates: string[];
  onSelectDate: (date: Date) => void;
};

export function DashboardCalendar({ selectedKey, todayKey, activeDates, onSelectDate }: Props) {
  const [displayYear, setDisplayYear] = useState(() => new Date().getFullYear());
  const [displayMonth, setDisplayMonth] = useState(() => new Date().getMonth());

  const datesWithHistory = new Set(activeDates);
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  const firstDayOffset = new Date(displayYear, displayMonth, 1).getDay();

  function prevMonth() {
    if (displayMonth === 0) { setDisplayYear((y) => y - 1); setDisplayMonth(11); }
    else setDisplayMonth((m) => m - 1);
  }

  function nextMonth() {
    if (displayMonth === 11) { setDisplayYear((y) => y + 1); setDisplayMonth(0); }
    else setDisplayMonth((m) => m + 1);
  }

  return (
    <aside>
      <div className="card cal">
        <div className="cal-head">
          <div className="cal-month">
            {MONTHS_TH[displayMonth]} <em>{toThai(displayYear + 543)}</em>
          </div>
          <div>
            <button type="button" className="cal-nav" onClick={prevMonth}>‹</button>
            <button type="button" className="cal-nav" onClick={nextMonth}>›</button>
          </div>
        </div>
        <table>
          <thead>
            <tr>{DAYS_TH.map((d) => <th key={d}>{d}</th>)}</tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.ceil((firstDayOffset + daysInMonth) / 7) }).map((_, week) => (
              <tr key={week}>
                {Array.from({ length: 7 }).map((_, dow) => {
                  const day = week * 7 + dow - firstDayOffset + 1;
                  if (day < 1 || day > daysInMonth) return <td key={dow} />;
                  const key = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isSelected = key === selectedKey;
                  const isT = key === todayKey;
                  const hasDot = datesWithHistory.has(key) && !isSelected;
                  return (
                    <td
                      key={dow}
                      className={[isSelected ? "sel" : "", isT && !isSelected ? "today" : "", hasDot ? "has-dot" : ""].filter(Boolean).join(" ")}
                      onClick={() => onSelectDate(new Date(displayYear, displayMonth, day))}
                    >
                      {day}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}
