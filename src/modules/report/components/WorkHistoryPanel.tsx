"use client";

import type { StaffWorkEntry } from "../schema";
import { formatDateThai, formatDuration } from "./report-utils";

type Props = {
  heading: string;
  subtitle: string;
  entries: StaffWorkEntry[];
  pending: boolean;
  showServiceCol?: boolean;
  showDateCol?: boolean;
  emptyMessage?: string;
};

export function WorkHistoryPanel({
  heading, subtitle, entries, pending,
  emptyMessage = "ไม่มีรายการในช่วงเวลานี้",
}: Props) {
  return (
    <div className="section" style={{ opacity: pending ? 0.5 : 1, transition: "opacity .15s" }}>
      <div className="card">
        <div className="head">
          <div>
            <h3>{heading}</h3>
            <span className="card-subtitle">{subtitle}</span>
          </div>
        </div>

        {entries.length > 0 ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>เวลา</th>
                  <th>รหัส</th>
                  <th>พนักงาน</th>
                  <th>แผนนวด</th>
                  <th>ห้อง</th>
                  <th>เวลาทำงาน</th>
                  <th>ค่าแรง/ชม</th>
                  <th>รายได้</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr key={idx}>
                    <td className="mono">{formatDateThai(entry.date)}</td>
                    <td>
                      <span className="td-time">{entry.time}–{entry.endTime}</span>
                      <span className="td-meridiem">{entry.meridiem}</span>
                    </td>
                    <td className="mono">{entry.staffCode ?? "—"}</td>
                    <td><span className="td-staff">{entry.staffName}</span></td>
                    <td>{entry.serviceName}</td>
                    <td>{entry.roomLabel ?? "—"}</td>
                    <td className="mono">{formatDuration(entry.durationMin)}</td>
                    <td className="mono">฿{entry.hourlyRateSnapshot.toLocaleString()}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>฿{entry.computedSalary.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="history-empty">
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
