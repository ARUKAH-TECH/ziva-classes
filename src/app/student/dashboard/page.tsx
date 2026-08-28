import { CalendarClock, Award, ListChecks } from "lucide-react";
import { requireStudent } from "@/lib/auth/require-student";
import { listMyOwnSchedule } from "@/lib/actions/schedules";
import { getStudentPerformanceSummary } from "@/lib/actions/scores";
import { listAssessments } from "@/lib/actions/assessments";
import { listMyOwnVisibleNeeds } from "@/lib/actions/student-needs";
import { StatCard } from "@/components/domain/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function StudentDashboardPage() {
  const { studentId } = await requireStudent();

  const [schedule, performance, assessments, needs] = await Promise.all([
    listMyOwnSchedule(),
    getStudentPerformanceSummary(studentId),
    listAssessments(),
    listMyOwnVisibleNeeds(),
  ]);

  const today = new Date().getDay();
  const nextClass = schedule
    .filter((s) => s.day_of_week === today)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];

  const pendingCount = assessments.filter((a) => a.score_count === 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1>Dashboard</h1>
        <p className="mt-1 text-sm text-ink-500">Your learning overview.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Next Class"
          value={nextClass ? `${nextClass.subject_name} · ${nextClass.start_time}` : "None today"}
          icon={CalendarClock}
          accent="royal"
        />
        <StatCard
          label="Latest Average"
          value={performance.overall_average !== null ? `${performance.overall_average}%` : "—"}
          icon={Award}
          accent="gold"
        />
        <StatCard label="Pending Assignments" value={pendingCount} icon={ListChecks} accent="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          {needs.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No feedback yet"
              description="Comments from your teachers on assessments and progress will appear here."
            />
          ) : (
            <ul className="space-y-3">
              {needs.slice(0, 3).map((n) => (
                <li key={n.id} className="rounded border border-gray-300 p-3">
                  <div className="flex items-center gap-2">
                    {n.subject_name && <Badge variant="neutral">{n.subject_name}</Badge>}
                    <Badge variant={n.priority === "HIGH" ? "error" : n.priority === "MEDIUM" ? "warning" : "neutral"}>
                      {n.priority}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-navy-900">{n.need_description}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
