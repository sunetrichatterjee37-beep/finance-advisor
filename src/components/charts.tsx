import { money } from "../domain/money";
import type { Metrics } from "../server/finance";
export function CashChart({
  points,
  onSelect,
  selected = 30,
}: {
  points: Metrics["projections"];
  onSelect?: (n: number) => void;
  selected?: number;
}) {
  const values = points.map((p) => p.cash);
  const range = Math.max(100, Math.max(...values) - Math.min(...values));
  const min = Math.min(...values) - range * 0.25,
    max = Math.max(...values) + range * 0.25;
  const y = (v: number) => 160 - ((v - min) / (max - min || 1)) * 125;
  const x = (i: number) => 50 + i * 180;
  const line = points.map((p, i) => `${x(i)},${y(p.cash)}`).join(" ");
  return (
    <div className="cash-chart">
      <svg
        viewBox="0 0 640 205"
        role="img"
        aria-label={
          "Projected cash: " +
          points.map((p) => `${p.days} days ${money(p.cash)}`).join(", ")
        }
      >
        <defs>
          <linearGradient id="cash-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#248e73" stopOpacity=".15" />
            <stop offset="1" stopColor="#248e73" stopOpacity=".015" />
          </linearGradient>
        </defs>
        {[50, 100, 150].map((v) => (
          <line
            key={v}
            x1="30"
            y1={v}
            x2="610"
            y2={v}
            stroke="#e8eceb"
            strokeDasharray="4 5"
          />
        ))}
        <polygon points={`50,170 ${line} 590,170`} fill="url(#cash-fill)" />
        <polyline
          points={line}
          fill="none"
          stroke="#087f79"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <g key={p.days}>
            <circle
              cx={x(i)}
              cy={y(p.cash)}
              r="5"
              fill="#fff"
              stroke="#087f79"
              strokeWidth="3"
            />
            <text
              x={x(i)}
              y={y(p.cash) - 15}
              textAnchor="middle"
              fill="#28475e"
              fontSize="13"
            >
              {money(p.cash)}
            </text>
            <text
              x={x(i)}
              y="197"
              textAnchor="middle"
              fill="#748078"
              fontSize="13"
            >
              {p.days === 0 ? "Today" : p.days + " days"}
            </text>
          </g>
        ))}
      </svg>
      <div className="mobile-chart-values">
        {points.map((p) => (
          <div key={p.days}>
            <span>{p.days === 0 ? "Today" : p.days + " days"}</span>
            <strong>{money(p.cash)}</strong>
          </div>
        ))}
      </div>
      {onSelect && (
        <div className="chart-controls">
          {points.map((p) => (
            <button
              key={p.days}
              className={p.days === selected ? "selected" : ""}
              onClick={() => onSelect(p.days)}
            >
              {p.days === 0 ? "Today" : p.days + " days"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export function BudgetBar({
  actual,
  committed,
  budget,
}: {
  actual: number;
  committed: number;
  budget: number;
}) {
  return (
    <div
      className="budget-bar"
      aria-label={`${Math.round(((actual + committed) / budget) * 100)} percent utilized`}
    >
      <i style={{ width: Math.min(100, (actual / budget) * 100) + "%" }} />
      <b
        style={{
          width:
            Math.min(
              100 - Math.min(100, (actual / budget) * 100),
              (committed / budget) * 100,
            ) + "%",
        }}
      />
    </div>
  );
}
