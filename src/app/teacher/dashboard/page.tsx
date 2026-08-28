import Link from "next/link";
import { CalendarClock, ClipboardCheck, Home } from "lucide-react";
import { StatCard } from "@/components/domain/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listMySessionsForDate, listMyUpcomingSessions } from "@/lib/actions/sessions";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function TeacherDashboardPage() {
  const date = today();
  const [todaySessions, upcoming] = await Promise.all([
    listMySessionsForDate(date),
    listMyUpcomingSessions(date, 7),
  ]);

  const pendingToday = todaySessions.filter((s) => !s.attendance_taken);
  const laterThisWeek = upcoming.filter((s) => s.session_date !== date);
  const homeService = upcoming.filter((s) => s.session_type === "HOME_SERVICE");

  return (
    <div className="space-y-6">
      <div>
        <h1>Dashboard</h1>
        <p className="mt-1 text-sm text-ink-500">Your teaching overview for today.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Today's Classes" value={todaySessions.length} icon={CalendarClock} accent="royal" />
        <StatCard label="Attendance Pending" value={pendingToday.length} icon={ClipboardCheck} accent="warning" />
        <StatCard label="Upcoming (7 days)" value={laterThisWeek.length} icon={CalendarClock} accent="sky" />
        <StatCard label="Home-Service Sessions" value={homeService.length} icon={Home} accent="gold" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Classes</CardTitle>
          </CardHeader>
          <CardContent>
            {todaySessions.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No classes today"
                description="Nothing scheduled for today yet."
              />
            ) : (
              <ul className="divide-y divide-gray-300">
                {todaySessions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span>
                      <span className="font-medium text-navy-900">
                        {s.start_time}–{s.end_time}
                      </span>{" "}
                      {s.subject_name} — {s.class_name}
                    </span>
                    <div className="flex items-center gap-2">
                      {s.attendance_taken ? (
                        <Badge variant="success">Taken</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                      <Link href={`/teacher/attendance/${s.id}`}>
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
            <CardTitle>Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {laterThisWeek.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Nothing else this week"
                description="No further sessions scheduled in the next 7 days."
              />
            ) : (
              <ul className="divide-y divide-gray-300">
                {laterThisWeek.slice(0, 6).map((s) => (
                  <li key={s.id} className="py-2.5 text-sm">
                    <span className="font-medium text-navy-900">{s.session_date}</span>{" "}
                    <span className="text-ink-500">
                      {s.start_time}–{s.end_time}
                    </span>{" "}
                    {s.subject_name} — {s.class_name}
                    {s.session_type === "HOME_SERVICE" && (
                      <Badge variant="gold" className="ml-2">
                        Home Service
                      </Badge>
                    )}
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
