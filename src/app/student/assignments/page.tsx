import { ListChecks } from "lucide-react";
import { listAssessments } from "@/lib/actions/assessments";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

// RLS's assessments_student_view (010) scopes listAssessments() to this
// student's own subjects; the embedded scores(score) it aggregates is in
// turn scoped by scores_student_view, so score_count/average_percentage
// here are this student's own — never another student's.
export default async function StudentAssignmentsPage() {
  const assessments = await listAssessments();
  const sorted = assessments
    .slice()
    .sort((a, b) => (b.assessment_date ?? "").localeCompare(a.assessment_date ?? ""));

  return (
    <div className="space-y-6">
      <div>
        <h1>Assignments</h1>
        <p className="mt-1 text-sm text-ink-500">Assignments, quizzes, tests, exams, and projects set for you.</p>
      </div>

      <Card>
        <CardContent>
          {sorted.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Nothing assigned yet"
              description="Assignments your teachers set will appear here."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Subject</TH>
                  <TH>Type</TH>
                  <TH>Date</TH>
                  <TH>Status</TH>
                  <TH>Score</TH>
                </TR>
              </THead>
              <TBody>
                {sorted.map((a) => (
                  <TR key={a.id}>
                    <TD className="font-medium text-navy-900">{a.name}</TD>
                    <TD>{a.subject_name}</TD>
                    <TD>
                      <Badge variant="neutral">{a.assessment_type}</Badge>
                    </TD>
                    <TD>{a.assessment_date ?? "—"}</TD>
                    <TD>
                      <Badge variant={a.score_count > 0 ? "success" : "warning"}>
                        {a.score_count > 0 ? "Graded" : "Pending"}
                      </Badge>
                    </TD>
                    <TD>{a.score_count > 0 ? `${a.average_percentage}%` : "—"}</TD>
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
