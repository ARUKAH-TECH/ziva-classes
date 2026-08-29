"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, X, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { addStudentSubject, removeStudentSubject, type StudentSubjectRow } from "@/lib/actions/student-subjects";
import type { CurrentEnrollment } from "@/lib/actions/students";

export function SubjectsTab({
  studentId,
  enrollment,
  studentSubjects,
  availableClassSubjects,
}: {
  studentId: string;
  enrollment: CurrentEnrollment | null;
  studentSubjects: StudentSubjectRow[];
  availableClassSubjects: { class_subject_id: string; subject_name: string }[];
}) {
  const enrolledIds = new Set(studentSubjects.map((s) => s.class_subject_id));
  const remaining = availableClassSubjects.filter((cs) => !enrolledIds.has(cs.class_subject_id));
  const [selected, setSelected] = useState(remaining[0]?.class_subject_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!enrollment) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={BookOpen}
            title="Not enrolled in a class"
            description="Assign this student to a class from the Overview tab before assigning subjects."
          />
        </CardContent>
      </Card>
    );
  }

  async function assign() {
    if (!selected || !enrollment) return;
    setBusy(true);
    const result = await addStudentSubject(studentId, selected, enrollment.academic_year_id);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    window.location.reload();
  }

  async function unassign(row: StudentSubjectRow) {
    if (!confirm(`Remove ${row.subject_name}?`)) return;
    const result = await removeStudentSubject(row.id, studentId);
    if (!result.success) {
      alert(result.error);
      return;
    }
    window.location.reload();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subjects — {enrollment.class_name} ({enrollment.academic_year_name})</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        {studentSubjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No subjects enrolled yet"
            description="Assign the subjects this student is taking from the class's subject list."
          />
        ) : (
          <ul className="mb-5 divide-y divide-gray-300 rounded border border-gray-300">
            {studentSubjects.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <span>
                  <span className="font-medium text-navy-900">{s.subject_name}</span>
                  <span className="text-ink-500"> · {s.teacher_name ?? "No teacher assigned yet"}</span>
                </span>
                <button
                  aria-label={`Remove ${s.subject_name}`}
                  onClick={() => unassign(s)}
                  className="rounded p-1 text-ink-500 hover:bg-gray-100 hover:text-error"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {remaining.length > 0 ? (
          <div className="flex items-end gap-2">
            <div className="max-w-xs flex-1">
              <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
                {remaining.map((cs) => (
                  <option key={cs.class_subject_id} value={cs.class_subject_id}>
                    {cs.subject_name}
                  </option>
                ))}
              </Select>
            </div>
            <Button size="sm" onClick={assign} disabled={busy || !selected}>
              <Plus className="h-4 w-4" /> Assign subject
            </Button>
          </div>
        ) : availableClassSubjects.length === 0 ? (
          <div className="rounded border border-warning/30 bg-warning/5 p-3">
            <p className="mb-2 text-sm text-ink-500">
              {enrollment.class_name} has no subjects assigned yet — add some there first.
            </p>
            <Link
              href={`/admin/classes/${enrollment.class_id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-royal-600 hover:underline"
            >
              Go to {enrollment.class_name} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <p className="text-sm text-ink-500">Enrolled in every subject this class offers.</p>
        )}
      </CardContent>
    </Card>
  );
}
