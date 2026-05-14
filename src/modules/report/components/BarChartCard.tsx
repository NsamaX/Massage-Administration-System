"use client";

import { formatDateThai, getDayDate } from "./report-utils";

function BarChart({ counts, selectedIdx, onSelect }: {
  counts: number[];
  selectedIdx: number | null;
  onSelect: (idx: number | null) => void;
}) {
  const max = Math.max(...counts, 1);
  const total = counts.length;
  const labelStep = total <= 10 ? 1 : total <= 31 ? 5 : 7;
  const peakIdx = counts.indexOf(max);
  return (
    <div>
      <div className="bar-chart">
        {counts.map((count, idx) => (
          <div
            key={idx}
            className={`bar${idx === peakIdx && count > 0 ? " peak" : ""}`}
            style={{
              height: `${(count / max) * 100}%`,
              minHeight: count > 0 ? "2px" : "0",
              cursor: count > 0 ? "pointer" : "default",
              outline: idx === selectedIdx ? "2px solid var(--brass)" : "none",
              outlineOffset: "2px",
            }}
            onClick={() => count > 0 && onSelect(idx === selectedIdx ? null : idx)}
          />
        ))}
      </div>
      <div className="bar-chart-x">
        {counts.map((_, idx) =>
          (idx + 1) % labelStep === 0 || idx === 0
            ? <span key={idx}>{idx + 1}</span>
            : <span key={idx} />
        )}
      </div>
    </div>
  );
}

type Props = {
  counts: number[];
  dailyRevenue: number[];
  startDate: string;
  endDate: string;
  selectedBarIdx: number | null;
  onBarSelect: (idx: number | null) => void;
};

export function BarChartCard({ counts, dailyRevenue, startDate, endDate, selectedBarIdx, onBarSelect }: Props) {
  const periodLabel = `${formatDateThai(startDate)} – ${formatDateThai(endDate)}`;
  const totalCustomers = counts.reduce((s, c) => s + c, 0);
  const totalRevenue = dailyRevenue.reduce((s, r) => s + r, 0);

  return (
    <div className="card chart-card report-bar">
      <div className="ch-head">
        <div>
          <div className="ttl">จำนวนลูกค้ารายวัน</div>
          <div className="range">
            {selectedBarIdx !== null
              ? formatDateThai(getDayDate(startDate, selectedBarIdx))
              : `${periodLabel} · ${counts.length} วัน`}
          </div>
        </div>
        <div className="ch-val">
          <div className="big-num">
            {selectedBarIdx !== null ? counts[selectedBarIdx] : totalCustomers}
            <span className="unit">ครั้ง</span>
          </div>
          <div className="mono ch-sub">
            ฿{(selectedBarIdx !== null ? dailyRevenue[selectedBarIdx] : totalRevenue).toLocaleString()}
          </div>
        </div>
      </div>
      <BarChart
        counts={counts}
        selectedIdx={selectedBarIdx}
        onSelect={onBarSelect}
      />
    </div>
  );
}
