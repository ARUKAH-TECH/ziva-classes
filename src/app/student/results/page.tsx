import { Award } from "lucide-react";
import { requireStudent } from "@/lib/auth/require-student";
import { getStudentPerformanceSummary } from "@/lib/actions/scores";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function StudentResultsPage() {
  const { studentId } = await requireStudent();
  const summary = await getStudentPerformanceSummary(studentId);

  return (
    <div className="space-y-6">
      <div>
        <h1>Results</h1>
        <p className="mt-1 text-sm text-ink-500">Your academic performance by subject.</p>
      </div>

      {summary.subject_averages.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Award}
              title="No scores recorded yet"
              description="Once your teachers enter scores, your performance will appear here."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Overall Average</CardTitle>
              <Badge variant={(summary.overall_average ?? 0) >= 50 ? "success" : "warning"}>
                {summary.overall_average}%
              </Badge>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summary.subject_averages.map((s) => (
              <Card key={s.subject_name}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-navy-900">{s.subject_name}</h3>
                    <Badge variant={s.average_percentage >= 50 ? "success" : "warning"}>
                      {s.average_percentage}%
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    {s.assessment_count} assessment{s.assessment_count === 1 ? "" : "s"} scored
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
