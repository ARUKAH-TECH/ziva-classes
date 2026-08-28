import Link from "next/link";
import { FileText } from "lucide-react";
import { listMyPublishedReports } from "@/lib/actions/terminal-reports";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default async function StudentTerminalReportsPage() {
  const reports = await listMyPublishedReports();

  return (
    <div className="space-y-6">
      <div>
        <h1>Terminal Reports</h1>
        <p className="mt-1 text-sm text-ink-500">Your published terminal reports.</p>
      </div>

      <Card>
        <CardContent>
          {reports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No published reports yet"
              description="Once your terminal report is published, it will appear here."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Academic Year</TH>
                  <TH>Term</TH>
                  <TH>Overall Average</TH>
                  <TH>Overall Grade</TH>
                  <TH className="text-right">Action</TH>
                </TR>
              </THead>
              <TBody>
                {reports.map((r) => (
                  <TR key={r.id}>
                    <TD>{r.academic_year_name}</TD>
                    <TD>{r.term_name}</TD>
                    <TD>{r.overall_average !== null ? `${r.overall_average}%` : "—"}</TD>
                    <TD>{r.overall_grade ?? "—"}</TD>
                    <TD className="text-right">
                      <Link href={`/student/terminal-reports/${r.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
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
