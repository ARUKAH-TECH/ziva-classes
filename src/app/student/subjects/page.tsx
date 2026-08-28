import { BookOpen } from "lucide-react";
import { requireStudent } from "@/lib/auth/require-student";
import { listStudentSubjects } from "@/lib/actions/student-subjects";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export default async function StudentSubjectsPage() {
  const { supabase, organizationId, studentId } = await requireStudent();

  const { data: currentYear } = await supabase
    .from("academic_years")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_current", true)
    .single();
  const yearId = (currentYear as { id: string } | null)?.id;

  const subjects = yearId ? await listStudentSubjects(studentId, yearId) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1>My Subjects</h1>
        <p className="mt-1 text-sm text-ink-500">Subjects you&apos;re enrolled in this academic year.</p>
      </div>

      <Card>
        <CardContent>
          {subjects.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No subjects yet"
              description="Your admin hasn't assigned you any subjects for this academic year."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Subject</TH>
                </TR>
              </THead>
              <TBody>
                {subjects.map((s) => (
                  <TR key={s.id}>
                    <TD className="font-medium text-navy-900">{s.subject_name}</TD>
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
