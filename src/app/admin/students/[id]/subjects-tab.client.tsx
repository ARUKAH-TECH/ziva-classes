"use client";

import { useState } from "react";
import { Plus, X, BookOpen } from "lucide-react";
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
            description="Enroll this student in a class from Classes before assigning subjects."
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
          <ul className="mb-5 flex flex-wrap gap-2">
            {studentSubjects.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-surface py-1 pl-3 pr-1.5 text-sm"
              >
                {s.subject_name}
                <button
                  aria-label={`Remove ${s.subject_name}`}
                  onClick={() => unassign(s)}
                  className="rounded-full p-0.5 text-ink-500 hover:bg-gray-100 hover:text-error"
                >
                  <X className="h-3.5 w-3.5" />
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
        ) : (
          <p className="text-sm text-ink-500">
            {availableClassSubjects.length === 0
              ? "This class has no subjects assigned yet — add some from Classes."
              : "Enrolled in every subject this class offers."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
