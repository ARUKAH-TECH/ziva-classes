"use client";

// A simple dependency-free horizontal bar chart — one bar per subject,
// scaled 0-100%. Deliberately not a charting library: this is the only
// graph in the app so far, and a few CSS bars cover it without adding a
// new dependency to the build.
export function PerformanceChart({
  data,
}: {
  data: { subject_name: string; average_percentage: number }[];
}) {
  if (data.length === 0) return null;

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.subject_name}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-navy-900">{d.subject_name}</span>
            <span className="text-ink-500">{d.average_percentage}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={barColor(d.average_percentage)}
              style={{ width: `${Math.min(100, Math.max(0, d.average_percentage))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function barColor(pct: number) {
  const base = "h-full rounded-full";
  if (pct >= 70) return `${base} bg-success`;
  if (pct >= 50) return `${base} bg-warning`;
  return `${base} bg-error`;
}
