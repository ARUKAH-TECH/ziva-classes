import { ClipboardCheck } from "lucide-react";
import { requireStudent } from "@/lib/auth/require-student";
import { listMyAttendanceRecords, getStudentAttendanceSummary } from "@/lib/actions/attendance";
import { StatCard } from "@/components/domain/stat-card";
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

export default async function StudentAttendancePage() {
  const { studentId } = await requireStudent();
  const [records, summary] = await Promise.all([
    listMyAttendanceRecords(),
    getStudentAttendanceSummary(studentId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1>Attendance</h1>
        <p className="mt-1 text-sm text-ink-500">Your attendance record across every session.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Attendance"
          value={summary.percentage !== null ? `${summary.percentage}%` : "—"}
          icon={ClipboardCheck}
          accent="royal"
        />
        <StatCard label="Present" value={summary.present} icon={ClipboardCheck} accent="success" />
        <StatCard label="Absent" value={summary.absent} icon={ClipboardCheck} accent="error" />
        <StatCard label="Late / Excused" value={summary.late + summary.excused} icon={ClipboardCheck} accent="warning" />
      </div>

      <Card>
        <CardContent>
          {records.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No sessions recorded yet"
              description="Attendance for your sessions will appear here once recorded."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Subject</TH>
                  <TH>Status</TH>
                  <TH>Remarks</TH>
                </TR>
              </THead>
              <TBody>
                {records.map((r) => (
                  <TR key={r.id}>
                    <TD>{r.session_date || "—"}</TD>
                    <TD className="font-medium text-navy-900">{r.subject_name}</TD>
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
