import { Award } from "lucide-react";
import { listMyChildren } from "@/lib/actions/parent-children";
import { getStudentPerformanceSummary } from "@/lib/actions/scores";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ParentPerformancePage() {
  const children = await listMyChildren();
  const summaries = await Promise.all(children.map((c) => getStudentPerformanceSummary(c.id)));

  return (
    <div className="space-y-6">
      <div>
        <h1>Performance</h1>
        <p className="mt-1 text-sm text-ink-500">Your children&apos;s academic performance by subject.</p>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={Award} title="No children linked" description="Link a child to see their performance here." />
          </CardContent>
        </Card>
      ) : (
        children.map((child, i) => {
          const summary = summaries[i];
          return (
            <Card key={child.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  {child.first_name} {child.last_name}
                </CardTitle>
                {summary.overall_average !== null && (
                  <Badge variant={summary.overall_average >= 50 ? "success" : "warning"}>
                    Overall: {summary.overall_average}%
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {summary.subject_averages.length === 0 ? (
                  <EmptyState
                    icon={Award}
                    title="No scores recorded yet"
                    description="Once teachers enter scores, performance will appear here."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {summary.subject_averages.map((s) => (
                      <div key={s.subject_name} className="rounded border border-gray-300 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-navy-900">{s.subject_name}</p>
                          <Badge variant={s.average_percentage >= 50 ? "success" : "warning"}>
                            {s.average_percentage}%
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-ink-500">
                          {s.assessment_count} assessment{s.assessment_count === 1 ? "" : "s"} scored
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
