import { Badge } from "@/components/ui/badge";
import { ZivaLogo } from "@/components/domain/ziva-logo";
import { PerformanceTrendChart } from "@/components/domain/performance-trend-chart.client";
import type { TerminalReportPayload } from "@/lib/reports/compute-report";
import type { ReportStatus, ReportHistoryPoint } from "@/lib/actions/terminal-reports";

const FEE_STATUS_LABEL: Record<string, string> = {
  CLEARED: "Cleared",
  PARTIALLY_PAID: "Partially Paid",
  OUTSTANDING: "Outstanding",
  NO_CHARGES: "No Charges Recorded",
};

export function TerminalReportView({
  payload,
  status,
  version,
  administratorComment,
  overallTeacherComment,
  photoUrl,
  orgName,
  orgMotto,
  history = [],
}: {
  payload: TerminalReportPayload;
  status: ReportStatus;
  version: number;
  administratorComment: string | null;
  overallTeacherComment: string | null;
  photoUrl: string | null;
  orgName: string;
  orgMotto: string;
  history?: ReportHistoryPoint[];
}) {
  // history already covers every PUBLISHED term for this student; add this
  // report's own term if it isn't in there yet (e.g. still a draft), so the
  // trend always includes "right now" even before publishing.
  const trendPoints = [
    ...history,
    ...(history.some((h) => h.term_id === payload.term_id)
      ? []
      : [
          {
            term_id: payload.term_id,
            term_name: payload.term_name,
            academic_year_name: payload.academic_year_name,
            overall_average: payload.overall_average,
            start_date: payload.term_start_date ?? "",
          },
        ]),
  ]
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .map((h) => ({
      label: h.term_name,
      average: h.overall_average,
      current: h.term_id === payload.term_id,
    }));

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-[12mm] text-ink-900 print:p-0 print:shadow-none" id="terminal-report">
      {/* Header */}
      <div className="flex items-center gap-4 border-b-2 border-gold-500 pb-4">
        <ZivaLogo size={64} />
        <div className="flex-1 text-center">
          <h1 className="font-heading text-xl font-bold text-navy-900">{orgName}</h1>
          <p className="text-xs font-medium uppercase tracking-wide text-gold-700">{orgMotto}</p>
          <p className="mt-0.5 text-[10px] text-ink-500">EST. 2023 · TERMINAL REPORT</p>
        </div>
        {status !== "PUBLISHED" && (
          <Badge variant="warning" className="print:hidden">
            {status === "DRAFT" ? "Draft — not yet published" : "Archived version"}
          </Badge>
        )}
      </div>

      {/* Student identity block */}
      <div className="mt-4 flex items-start gap-4 rounded border border-gray-300 bg-surface p-4">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={`${payload.student.first_name} ${payload.student.last_name}`}
            className="h-24 w-20 rounded border border-gray-300 object-cover"
          />
        ) : (
          <div className="flex h-24 w-20 items-center justify-center rounded border border-gray-300 bg-gray-100 text-xs text-ink-500">
            No Photo
          </div>
        )}
        <div className="grid flex-1 grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <Field label="Student Name" value={`${payload.student.first_name} ${payload.student.last_name}`} />
          <Field label="Student ID" value={payload.student.student_number} mono />
          <Field label="Parent/Guardian" value={payload.parent_names.join(", ") || "—"} />
          <Field label="Class / Level" value={`${payload.class_name} (${payload.academic_level_name})`} />
          <Field label="Academic Year" value={payload.academic_year_name} />
          <Field label="Term" value={payload.term_name} />
          <Field label="Report Date" value={payload.report_date} />
          <Field label="Version" value={`v${version}`} mono />
        </div>
      </div>

      {/* Academic section */}
      <h2 className="mb-2 mt-5 font-heading text-sm font-bold uppercase tracking-wide text-navy-900">
        Academic Performance
      </h2>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-navy-900 text-white">
            <th className="border border-navy-900 px-2 py-1.5 text-left">Subject</th>
            <th className="border border-navy-900 px-2 py-1.5 text-right">Class Work (50%)</th>
            <th className="border border-navy-900 px-2 py-1.5 text-right">Exam (50%)</th>
            <th className="border border-navy-900 px-2 py-1.5 text-right">Total (100%)</th>
            <th className="border border-navy-900 px-2 py-1.5 text-center">Grade</th>
          </tr>
        </thead>
        <tbody>
          {payload.subjects.length === 0 ? (
            <tr>
              <td colSpan={5} className="border border-gray-300 px-2 py-3 text-center text-ink-500">
                No subjects enrolled.
              </td>
            </tr>
          ) : (
            payload.subjects.map((s) => (
              <tr key={s.subject_name} className="odd:bg-surface">
                <td className="border border-gray-300 px-2 py-1.5 font-medium">{s.subject_name}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">
                  {s.class_work_scaled !== null ? `${s.class_work_scaled}/50` : "—"}
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">
                  {s.exam_scaled !== null ? `${s.exam_scaled}/50` : "—"}
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-semibold">
                  {s.subject_average_percentage !== null ? `${s.subject_average_percentage}/100` : "—"}
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-center font-semibold text-gold-700">
                  {s.subject_grade ?? "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Performance summary */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide text-navy-900">
            Performance Summary
          </h2>
          <div className="space-y-1 text-xs">
            <Field label="Overall Average" value={payload.overall_average !== null ? `${payload.overall_average}%` : "—"} />
            <Field label="Overall Grade" value={payload.overall_grade ?? "—"} />
            <Field
              label="Total Score"
              value={
                payload.overall_total_possible > 0
                  ? `${payload.overall_total_score} out of ${payload.overall_total_possible}`
                  : "—"
              }
            />
            <Field label="Number of Subjects" value={String(payload.subject_count)} />
            <Field label="Strongest Subject" value={payload.strongest_subject ?? "—"} />
            <Field
              label="Areas Requiring Improvement"
              value={payload.areas_for_improvement.length > 0 ? payload.areas_for_improvement.join(", ") : "None noted"}
            />
            {payload.ranking_enabled && (
              <Field
                label="Position"
                value={payload.position !== null ? `${payload.position} of ${payload.class_size}` : "—"}
              />
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide text-navy-900">Attendance</h2>
          <div className="space-y-1 text-xs">
            <Field
              label="Attendance"
              value={`${payload.attendance.present} out of ${payload.attendance.total_sessions}`}
            />
            <Field label="Absent" value={String(payload.attendance.absent)} />
            <Field label="Late" value={String(payload.attendance.late)} />
            <Field label="Excused" value={String(payload.attendance.excused)} />
            <Field
              label="Attendance Percentage"
              value={payload.attendance.percentage !== null ? `${payload.attendance.percentage}%` : "—"}
            />
          </div>
        </div>
      </div>

      {/* Performance trend across terms */}
      {trendPoints.some((p) => p.average !== null) && (
        <div className="mt-5">
          <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide text-navy-900">
            Performance Trend (Term vs. Overall Score)
          </h2>
          <div className="rounded border border-gray-300 bg-surface p-3">
            <PerformanceTrendChart points={trendPoints} />
          </div>
        </div>
      )}

      {/* Overall teacher comment */}
      <div className="mt-4">
        <h2 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide text-navy-900">
          Overall Teacher Comment
        </h2>
        <p className="min-h-[2rem] rounded border border-gray-300 bg-surface p-2 text-xs">
          {overallTeacherComment || "—"}
        </p>
      </div>

      {/* Fee status (simple badge only — no transaction detail, per §27) */}
      <div className="mt-4 flex items-center gap-2">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-navy-900">Fee Status</h2>
        <Badge
          variant={
            payload.fee_status === "CLEARED"
              ? "success"
              : payload.fee_status === "PARTIALLY_PAID"
              ? "warning"
              : payload.fee_status === "OUTSTANDING"
              ? "error"
              : "neutral"
          }
        >
          {FEE_STATUS_LABEL[payload.fee_status]}
        </Badge>
      </div>

      {/* Administrative section */}
      <div className="mt-5 border-t-2 border-gold-500 pt-4">
        <h2 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide text-navy-900">
          Administrator&apos;s Comment
        </h2>
        <p className="min-h-[2rem] rounded border border-gray-300 bg-surface p-2 text-xs">
          {administratorComment || "—"}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 text-xs sm:grid-cols-3">
          <SignatureBlock label="Authorized By" />
          <SignatureBlock label="Date" />
          <SignatureBlock label="Next Term Begins" />
        </div>
      </div>

      <p className="mt-8 text-center text-[9px] text-ink-500">
        This is an official ZIVA Online &amp; Special Classes academic document. {orgName} · {orgMotto}
      </p>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-500">{label}</span>
      <span className={`text-right font-medium text-navy-900 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function SignatureBlock({ label }: { label: string }) {
  return (
    <div>
      <div className="h-8 border-b border-ink-500" />
      <p className="mt-1 text-center text-[10px] text-ink-500">{label}</p>
    </div>
  );
}
