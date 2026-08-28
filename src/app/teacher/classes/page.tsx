import { GraduationCap } from "lucide-react";
import { listMyTeacherAssignments } from "@/lib/actions/teacher-assignments";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function TeacherClassesPage() {
  const assignments = await listMyTeacherAssignments();

  const byClass = new Map<string, { academic_year_name: string; subjects: string[] }>();
  for (const a of assignments) {
    const entry = byClass.get(a.class_name) ?? { academic_year_name: a.academic_year_name, subjects: [] };
    entry.subjects.push(a.subject_name);
    byClass.set(a.class_name, entry);
  }
  const classes = Array.from(byClass.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <div>
        <h1>My Classes</h1>
        <p className="mt-1 text-sm text-ink-500">Classes you teach at least one subject in.</p>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={GraduationCap}
              title="No classes yet"
              description="Your admin hasn't assigned you to any class/subject yet."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map(([className, entry]) => (
            <Card key={className}>
              <CardContent>
                <h3 className="text-base font-semibold text-navy-900">{className}</h3>
                <p className="mt-0.5 text-xs text-ink-500">{entry.academic_year_name}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {entry.subjects.map((s) => (
                    <Badge key={s} variant="neutral">
                      {s}
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
