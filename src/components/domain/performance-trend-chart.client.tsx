"use client";

// Vertical bar graph, one bar per term in chronological order, with a 0-100%
// scale drawn behind the bars — plus an improving/declining/steady readout
// comparing the two most recent graded terms. Deliberately not a charting
// library, matching the pattern in performance-chart.client.tsx.
const SCALE = [100, 75, 50, 25, 0];
const CHART_HEIGHT = 128; // px

export function PerformanceTrendChart({
  points,
}: {
  points: { label: string; average: number | null; current?: boolean }[];
}) {
  if (points.length === 0) return null;

  const graded = points.filter((p) => p.average !== null);
  const last = graded[graded.length - 1] ?? null;
  const prev = graded.length > 1 ? graded[graded.length - 2] : null;
  const delta = last && prev ? Math.round((last.average! - prev.average!) * 10) / 10 : null;

  return (
    <div>
      {delta !== null && (
        <p className="mb-3 text-xs font-medium">
          {delta > 0 ? (
            <span className="text-success">▲ Improving — up {delta}% from the previous term</span>
          ) : delta < 0 ? (
            <span className="text-error">▼ Declining — down {Math.abs(delta)}% from the previous term</span>
          ) : (
            <span className="text-ink-500">→ Steady — unchanged from the previous term</span>
          )}
        </p>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {/* Y-axis scale */}
        <div className="flex flex-col justify-between text-[9px] text-ink-400" style={{ height: CHART_HEIGHT }}>
          {SCALE.map((v) => (
            <span key={v}>{v}%</span>
          ))}
        </div>

        {/* Plot area with gridlines */}
        <div
          className="relative flex flex-1 items-end gap-4 border-l border-b border-gray-300"
          style={{ height: CHART_HEIGHT }}
        >
          {SCALE.map((v) => (
            <div
              key={v}
              className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-gray-200"
              style={{ bottom: `${v}%` }}
            />
          ))}
          {points.map((p, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center" style={{ minWidth: 48 }}>
              <span className="mb-1 text-[10px] font-semibold text-navy-900">
                {p.average !== null ? `${p.average}%` : "—"}
              </span>
              <div className="flex w-6 items-end overflow-hidden rounded-t bg-gray-200" style={{ height: CHART_HEIGHT - 20 }}>
                {p.average !== null && (
                  <div
                    className={barColor(p.average)}
                    style={{ height: `${Math.min(100, Math.max(2, p.average))}%`, width: "100%" }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* X-axis term labels */}
      <div className="ml-[26px] mt-1 flex gap-4">
        {points.map((p, i) => (
          <span
            key={i}
            className={`max-w-[56px] text-center text-[10px] leading-tight ${
              p.current ? "font-semibold text-navy-900" : "text-ink-500"
            }`}
            style={{ minWidth: 48 }}
          >
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function barColor(pct: number) {
  if (pct >= 70) return "bg-success";
  if (pct >= 50) return "bg-warning";
  return "bg-error";
}
