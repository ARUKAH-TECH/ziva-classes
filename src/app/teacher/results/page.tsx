import { BarChart3 } from "lucide-react";
import { listAssessments } from "@/lib/actions/assessments";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export default async function TeacherResultsPage() {
  const assessments = await listAssessments();
  const scored = assessments.filter((a) => a.score_count > 0);

  const bySubject = new Map<string, typeof scored>();
  scored.forEach((a) => {
    const key = `${a.subject_name} — ${a.class_name}`;
    const list = bySubject.get(key) ?? [];
    list.push(a);
    bySubject.set(key, list);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1>Results</h1>
        <p className="mt-1 text-sm text-ink-500">Performance across the assessments you&apos;ve scored.</p>
      </div>

      {bySubject.size === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={BarChart3}
              title="No scored assessments yet"
              description="Once you enter scores on an assessment, subject performance will appear here."
            />
          </CardContent>
        </Card>
      ) : (
        Array.from(bySubject.entries()).map(([subject, list]) => {
          const avg =
            Math.round(
              (list.reduce((sum, a) => sum + (a.average_percentage ?? 0), 0) / list.length) * 10
            ) / 10;
          return (
            <Card key={subject}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{subject}</CardTitle>
                <Badge variant={avg >= 50 ? "success" : "warning"}>Average: {avg}%</Badge>
              </CardHeader>
              <CardContent>
                <Table>
                  <THead>
                    <TR>
                      <TH>Assessment</TH>
                      <TH>Type</TH>
                      <TH>Date</TH>
                      <TH>Scores entered</TH>
                      <TH>Average</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {list
                      .slice()
                      .sort((a, b) => (a.assessment_date ?? "").localeCompare(b.assessment_date ?? ""))
                      .map((a) => (
                        <TR key={a.id}>
                          <TD className="font-medium text-navy-900">{a.name}</TD>
                          <TD>
                            <Badge variant="neutral">{a.assessment_type}</Badge>
                          </TD>
                          <TD>{a.assessment_date ?? "—"}</TD>
                          <TD>{a.score_count}</TD>
                          <TD>{a.average_percentage}%</TD>
                        </TR>
                      ))}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
