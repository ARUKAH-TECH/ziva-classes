import { Users, ClipboardCheck, Award, Wallet } from "lucide-react";
import { listStudents } from "@/lib/actions/students";
import { getAttendanceOverviewByClass } from "@/lib/actions/attendance";
import { listAssessments } from "@/lib/actions/assessments";
import { getFinancialDashboardStats } from "@/lib/actions/payments";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export default async function AdminReportsPage() {
  const [students, attendanceByClass, assessments, financials] = await Promise.all([
    listStudents(),
    getAttendanceOverviewByClass(),
    listAssessments(),
    getFinancialDashboardStats(),
  ]);

  const enrollmentByClass = new Map<string, number>();
  students
    .filter((s) => s.status === "ACTIVE")
    .forEach((s) => {
      const key = s.class_name ?? "Unassigned";
      enrollmentByClass.set(key, (enrollmentByClass.get(key) ?? 0) + 1);
    });

  const scored = assessments.filter((a) => a.score_count > 0);
  const academicByClass = new Map<string, number[]>();
  scored.forEach((a) => {
    const list = academicByClass.get(a.class_name) ?? [];
    list.push(a.average_percentage ?? 0);
    academicByClass.set(a.class_name, list);
  });

  const classNames = Array.from(
    new Set([...enrollmentByClass.keys(), ...attendanceByClass.map((c) => c.class_name), ...academicByClass.keys()])
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <div>
        <h1>Reports</h1>
        <p className="mt-1 text-sm text-ink-500">
          Enrollment, attendance, academic performance, and fee collection by class.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-royal-600/10 text-royal-600">
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs text-ink-500">Active Students</p>
              <p className="text-lg font-semibold text-navy-900">
                {students.filter((s) => s.status === "ACTIVE").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-success/10 text-success">
              <Award className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs text-ink-500">Assessments Scored</p>
              <p className="text-lg font-semibold text-navy-900">{scored.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-gold-500/10 text-gold-500">
              <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs text-ink-500">Classes Tracked</p>
              <p className="text-lg font-semibold text-navy-900">{attendanceByClass.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-warning/10 text-warning">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs text-ink-500">Total Collected</p>
              <p className="text-lg font-semibold text-navy-900">GH₵{financials.total_collected}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By class</CardTitle>
        </CardHeader>
        <CardContent>
          {classNames.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No data yet"
              description="Enrollment, attendance, and academic figures by class will appear here."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Class</TH>
                  <TH>Active Students</TH>
                  <TH>Attendance Rate</TH>
                  <TH>Academic Average</TH>
                  <TH>Fee Revenue</TH>
                </TR>
              </THead>
              <TBody>
                {classNames.map((className) => {
                  const enrollment = enrollmentByClass.get(className) ?? 0;
                  const attendance = attendanceByClass.find((c) => c.class_name === className);
                  const academic = academicByClass.get(className);
                  const academicAvg = academic
                    ? Math.round((academic.reduce((a, b) => a + b, 0) / academic.length) * 10) / 10
                    : null;
                  const revenue = financials.revenue_by_class.find((r) => r.class_name === className)?.amount ?? 0;
                  return (
                    <TR key={className}>
                      <TD className="font-medium text-navy-900">{className}</TD>
                      <TD>{enrollment}</TD>
                      <TD>
                        {attendance ? (
                          <Badge variant={attendance.percentage >= 75 ? "success" : "warning"}>
                            {attendance.percentage}%
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TD>
                      <TD>
                        {academicAvg !== null ? (
                          <Badge variant={academicAvg >= 50 ? "success" : "warning"}>{academicAvg}%</Badge>
                        ) : (
                          "—"
                        )}
                      </TD>
                      <TD>GH₵{revenue}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
