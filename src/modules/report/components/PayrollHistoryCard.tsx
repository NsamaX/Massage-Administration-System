"use client";

import type { PayrollPeriod } from "../schema";

type Props = {
  payrollHistory: PayrollPeriod[];
  startDate: string;
  endDate: string;
  onHistoryClick: (h: PayrollPeriod) => void;
};

export function PayrollHistoryCard({ payrollHistory, startDate, endDate, onHistoryClick }: Props) {
  return (
    <div className="card report-history">
      <div className="head">
        <h3>ประวัติงวด</h3>
      </div>
      {payrollHistory.length === 0 ? (
        <div className="history-empty">
          <p>ยังไม่มีประวัติ</p>
        </div>
      ) : (
        payrollHistory.map((h) => {
          const [hStart, hEnd] = h.key.split("_");
          const isActive = startDate === hStart && endDate === hEnd;
          return (
            <button
              key={h.key}
              type="button"
              className={`history-row${isActive ? " active" : ""}`}
              onClick={() => onHistoryClick(h)}
            >
              <span style={{ display: "flex", alignItems: "center" }}>
                <span className="d" />
                <span className="lbl">{h.label}</span>
              </span>
              <span className="arrow">→</span>
            </button>
          );
        })
      )}
    </div>
  );
}
