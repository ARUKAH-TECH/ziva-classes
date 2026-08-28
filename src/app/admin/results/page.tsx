import { BarChart3 } from "lucide-react";
import { listAssessments } from "@/lib/actions/assessments";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export default async function AdminResultsPage() {
  const assessments = await listAssessments();
  const scored = assessments.filter((a) => a.score_count > 0);

  const byClass = new Map<string, typeof scored>();
  scored.forEach((a) => {
    const key = `${a.class_name} — ${a.subject_name}`;
    const list = byClass.get(key) ?? [];
    list.push(a);
    byClass.set(key, list);
  });

  const rows = Array.from(byClass.entries())
    .map(([key, list]) => ({
      key,
      average: Math.round((list.reduce((sum, a) => sum + (a.average_percentage ?? 0), 0) / list.length) * 10) / 10,
      count: list.length,
    }))
    .sort((a, b) => b.average - a.average);

  return (
    <div className="space-y-6">
      <div>
        <h1>Results</h1>
        <p className="mt-1 text-sm text-ink-500">Performance overview across every class and subject.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class &amp; subject averages</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No scored assessments yet"
              description="Once teachers enter scores, performance by class and subject will appear here."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Class — Subject</TH>
                  <TH>Assessments scored</TH>
                  <TH>Average</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.key}>
                    <TD className="font-medium text-navy-900">{r.key}</TD>
                    <TD>{r.count}</TD>
                    <TD>
                      <Badge variant={r.average >= 50 ? "success" : "warning"}>{r.average}%</Badge>
                    </TD>
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
