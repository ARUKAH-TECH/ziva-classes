import Link from "next/link";
import {
  Users,
  GraduationCap,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  Wallet,
  Megaphone,
} from "lucide-react";
import { StatCard } from "@/components/domain/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listStudents } from "@/lib/actions/students";
import { listTeachers } from "@/lib/actions/teachers";
import { listClasses } from "@/lib/actions/classes";
import { listSessionsForDate } from "@/lib/actions/sessions";
import { getFinancialDashboardStats, listRecentPayments } from "@/lib/actions/payments";
import { listPendingChangeRequests } from "@/lib/actions/change-requests";
import { listStudentNeeds } from "@/lib/actions/student-needs";
import { listAnnouncements } from "@/lib/actions/announcements";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function AdminDashboardPage() {
  const date = today();
  const [students, teachers, classes, sessions, financials, recentPayments, pendingRequests, openNeeds, announcements] =
    await Promise.all([
      listStudents(),
      listTeachers(),
      listClasses(),
      listSessionsForDate(date),
      getFinancialDashboardStats(),
      listRecentPayments(5),
      listPendingChangeRequests(),
      listStudentNeeds(),
      listAnnouncements(5),
    ]);

  const highPriorityOpenNeeds = openNeeds.filter((n) => n.status === "OPEN" && n.priority === "HIGH");

  const activeStudents = students.filter((s) => s.status === "ACTIVE").length;
  const sessionsAttendanceTaken = sessions.filter((s) => s.attendance_taken).length;

  return (
    <div className="space-y-6">
      <div>
        <h1>Dashboard</h1>
        <p className="mt-1 text-sm text-ink-500">Organization overview — {date}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Students" value={students.length} icon={Users} accent="royal" />
        <StatCard label="Active Students" value={activeStudents} icon={Users} accent="sky" />
        <StatCard label="Total Teachers" value={teachers.length} icon={GraduationCap} accent="royal" />
        <StatCard label="Total Classes" value={classes.length} icon={BookOpen} accent="sky" />
        <StatCard label="Today's Sessions" value={sessions.length} icon={CalendarClock} accent="gold" />
        <StatCard
          label="Attendance Today"
          value={sessions.length > 0 ? `${sessionsAttendanceTaken}/${sessions.length}` : "—"}
          icon={ClipboardCheck}
          accent="success"
        />
        <StatCard label="Outstanding Fees" value={`GH₵${financials.outstanding_fees}`} icon={Wallet} accent="warning" />
        <StatCard label="Payments Received" value={`GH₵${financials.total_collected}`} icon={Wallet} accent="success" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No sessions scheduled"
                description="Generate today's sessions from the Attendance page, or add a schedule from Timetable."
              />
            ) : (
              <ul className="divide-y divide-gray-300">
                {sessions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span>
                      <span className="font-medium text-navy-900">
                        {s.start_time}–{s.end_time}
                      </span>{" "}
                      {s.subject_name} — {s.class_name} ({s.teacher_name})
                    </span>
                    <div className="flex items-center gap-2">
                      {s.attendance_taken ? (
                        <Badge variant="success">Taken</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                      <Link href={`/admin/attendance/${s.id}`}>
                        <Button variant="ghost" size="sm">
                          Open
                        </Button>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Students Needing Attention</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 && highPriorityOpenNeeds.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nothing flagged"
                description="Pending parent requests and high-priority open needs will surface here."
              />
            ) : (
              <ul className="divide-y divide-gray-300">
                {pendingRequests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/admin/students/${r.student_id}`} className="text-navy-900 hover:text-royal-600 hover:underline">
                      {r.student_name}
                    </Link>
                    <Badge variant="warning">{r.request_type === "PHOTO" ? "Photo request" : "Location request"}</Badge>
                  </li>
                ))}
                {highPriorityOpenNeeds.map((n) => (
                  <li key={n.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/admin/students/${n.student_id}`} className="text-navy-900 hover:text-royal-600 hover:underline">
                      {n.student_name}
                    </Link>
                    <Badge variant="error">High-priority need</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No payments recorded yet"
                description="Recorded MTN Mobile Money and cash payments will appear here."
              />
            ) : (
              <ul className="divide-y divide-gray-300">
                {recentPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                    <Link href={`/admin/students/${p.student_id}`} className="text-navy-900 hover:text-royal-600 hover:underline">
                      {p.student_name}
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral">{p.payment_method === "MTN_MOBILE_MONEY" ? "MTN MoMo" : "Cash"}</Badge>
                      <span className="font-medium text-navy-900">GH₵{p.amount}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="No announcements yet"
                description="Organization-wide announcements will be listed here."
              />
            ) : (
              <ul className="divide-y divide-gray-300">
                {announcements.map((a) => (
                  <li key={a.id} className="py-2 text-sm">
                    <p className="font-medium text-navy-900">{a.title}</p>
                    <p className="text-ink-500">{a.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
