"use client";

import { DONUT_COLORS } from "./report-utils";

function DonutChart({ items }: { items: { name: string; percent: number }[] }) {
  const size = 160;
  const strokeWidth = 30;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const topName = items[0]?.name ?? "—";
  const topPercent = items[0]?.percent ?? 0;
  const hasData = items.some((i) => i.percent > 0);

  let cumulative = 0;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth={strokeWidth} />
        {hasData && items.map((item, idx) => {
          if (item.percent === 0) return null;
          const segLen = (item.percent / 100) * circumference;
          const dashOffset = circumference - (cumulative / 100) * circumference;
          cumulative += item.percent;
          return (
            <circle
              key={idx}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={DONUT_COLORS[idx % DONUT_COLORS.length]}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segLen} ${circumference - segLen}`}
              strokeDashoffset={dashOffset}
            />
          );
        })}
      </svg>
      <div className="donut-center">
        <div className="donut-label">
          <div className="donut-pct">{hasData ? topPercent : 0}</div>
          <div className="donut-name">{hasData ? topName : "—"}</div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  items: { name: string; percent: number }[];
  selectedServiceName: string | null;
  onServiceClick: (name: string) => void;
};

export function ServicePopularityCard({ items, selectedServiceName, onServiceClick }: Props) {
  return (
    <div className="card chart-card report-donut">
      <div className="ch-head">
        <div>
          <div className="ttl">แผนนวดยอดนิยม</div>
          <div className="range">สัดส่วนการให้บริการในช่วงรายงาน</div>
        </div>
      </div>
      <div className="donut-wrap">
        <DonutChart items={items} />
        <div style={{ flex: 1 }}>
          {items.length > 0 ? (
            items.map((item, idx) => {
              const isClickable = item.name !== "อื่นๆ";
              const isSelected = selectedServiceName === item.name;
              return (
                <div
                  key={idx}
                  className="donut-legend-row"
                  onClick={() => isClickable && onServiceClick(item.name)}
                  style={{
                    cursor: isClickable ? "pointer" : "default",
                    background: isSelected ? "var(--line)" : "transparent",
                    borderRadius: "4px", margin: "0 -4px", padding: "0 4px",
                  }}
                >
                  <span className="donut-legend-name">
                    <span className="donut-color-dot" style={{ background: DONUT_COLORS[idx % DONUT_COLORS.length] }} />
                    <span className="serif" style={{ fontSize: "16px" }}>{item.name}</span>
                  </span>
                  <span className="mono" style={{ fontSize: "11.5px", color: "var(--muted)" }}>{item.percent}%</span>
                </div>
              );
            })
          ) : (
            <div className="serif-it" style={{ color: "var(--faint)", fontSize: "16px" }}>ไม่มีข้อมูล</div>
          )}
        </div>
      </div>
    </div>
  );
}
