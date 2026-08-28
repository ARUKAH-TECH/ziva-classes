import { BookOpen } from "lucide-react";
import { listMyTeacherAssignments } from "@/lib/actions/teacher-assignments";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function TeacherSubjectsPage() {
  const assignments = await listMyTeacherAssignments();

  const bySubject = new Map<string, { academic_year_name: string; classes: string[] }>();
  for (const a of assignments) {
    const entry = bySubject.get(a.subject_name) ?? { academic_year_name: a.academic_year_name, classes: [] };
    entry.classes.push(a.class_name);
    bySubject.set(a.subject_name, entry);
  }
  const subjects = Array.from(bySubject.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <div>
        <h1>My Subjects</h1>
        <p className="mt-1 text-sm text-ink-500">Subjects you teach, and which classes.</p>
      </div>

      {subjects.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={BookOpen}
              title="No subjects yet"
              description="Your admin hasn't assigned you to any class/subject yet."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map(([subjectName, entry]) => (
            <Card key={subjectName}>
              <CardContent>
                <h3 className="text-base font-semibold text-navy-900">{subjectName}</h3>
                <p className="mt-0.5 text-xs text-ink-500">{entry.academic_year_name}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {entry.classes.map((c) => (
                    <Badge key={c} variant="neutral">
                      {c}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
