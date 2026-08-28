import { ClipboardCheck } from "lucide-react";
import { listMyChildren } from "@/lib/actions/parent-children";
import { listMyChildrenAttendanceRecords, getStudentAttendanceSummary } from "@/lib/actions/attendance";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_VARIANT = {
  PRESENT: "success",
  LATE: "warning",
  EXCUSED: "neutral",
  ABSENT: "error",
} as const;

export default async function ParentAttendancePage() {
  const [children, records] = await Promise.all([listMyChildren(), listMyChildrenAttendanceRecords()]);
  const summaries = await Promise.all(children.map((c) => getStudentAttendanceSummary(c.id)));

  return (
    <div className="space-y-6">
      <div>
        <h1>Attendance</h1>
        <p className="mt-1 text-sm text-ink-500">Your children&apos;s attendance record.</p>
      </div>

      {children.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child, i) => (
            <Card key={child.id} className="p-5">
              <p className="text-sm font-semibold text-navy-900">
                {child.first_name} {child.last_name}
              </p>
              <p className="mt-1 text-2xl font-semibold text-navy-900">
                {summaries[i].percentage !== null ? `${summaries[i].percentage}%` : "—"}
              </p>
              <p className="text-xs text-ink-500">
                {summaries[i].present} present · {summaries[i].absent} absent · {summaries[i].late} late ·{" "}
                {summaries[i].excused} excused
              </p>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent>
          {records.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No sessions recorded yet"
              description="Attendance for your children's sessions will appear here once recorded."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Child</TH>
                  <TH>Subject</TH>
                  <TH>Status</TH>
                  <TH>Remarks</TH>
                </TR>
              </THead>
              <TBody>
                {records.map((r) => (
                  <TR key={r.id}>
                    <TD>{r.session_date || "—"}</TD>
                    <TD className="font-medium text-navy-900">{r.child_name}</TD>
                    <TD>{r.subject_name}</TD>
                    <TD>
                      <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                    </TD>
                    <TD>{r.remarks ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
