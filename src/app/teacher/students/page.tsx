import { Users } from "lucide-react";
import { listMyStudents } from "@/lib/actions/students";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export default async function TeacherStudentsPage() {
  const students = await listMyStudents();

  return (
    <div className="space-y-6">
      <div>
        <h1>My Students</h1>
        <p className="mt-1 text-sm text-ink-500">Every student across the classes and subjects you teach.</p>
      </div>

      <Card>
        <CardContent>
          {students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No students yet"
              description="Once you're assigned to a class/subject with enrolled students, they'll appear here."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Class</TH>
                  <TH>Subjects</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {students.map((s) => (
                  <TR key={s.id}>
                    <TD className="font-medium text-navy-900">
                      {s.first_name} {s.last_name}
                    </TD>
                    <TD>{s.class_name}</TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {s.subject_names.map((name) => (
                          <Badge key={name} variant="neutral">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </TD>
                    <TD>
                      <Badge variant={s.status === "ACTIVE" ? "success" : "neutral"}>{s.status}</Badge>
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
