"use client";

import { useState } from "react";
import { Plus, X, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createTeacherAssignment,
  removeTeacherAssignment,
  type TeacherAssignmentRow,
  type AssignableClassSubject,
} from "@/lib/actions/teacher-assignments";
import type { AcademicYear } from "@/lib/actions/academic-years";

export function TeacherAssignmentsClient({
  teacherId,
  initialAssignments,
  assignable,
  years,
}: {
  teacherId: string;
  initialAssignments: TeacherAssignmentRow[];
  assignable: AssignableClassSubject[];
  years: AcademicYear[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [classSubjectId, setClassSubjectId] = useState(assignable[0]?.class_subject_id ?? "");
  const currentYear = years.find((y) => y.is_current) ?? years[0];
  const [yearId, setYearId] = useState(currentYear?.id ?? "");
  const [busy, setBusy] = useState(false);

  async function assign() {
    if (!classSubjectId || !yearId) return;
    setBusy(true);
    const result = await createTeacherAssignment({
      teacher_id: teacherId,
      class_subject_id: classSubjectId,
      academic_year_id: yearId,
    });
    setBusy(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    window.location.reload();
  }

  async function remove(a: TeacherAssignmentRow) {
    if (!confirm(`Remove ${a.subject_name} (${a.class_name}) from this teacher?`)) return;
    const result = await removeTeacherAssignment(a.id);
    if (!result.success) {
      alert(result.error);
      return;
    }
    setAssignments((prev) => prev.filter((x) => x.id !== a.id));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class &amp; subject assignments</CardTitle>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No assignments yet"
            description="Assign this teacher to a class and subject below. Per requirement, a teacher can teach multiple subjects across multiple classes."
          />
        ) : (
          <ul className="mb-5 divide-y divide-gray-300 rounded border border-gray-300">
            {assignments.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <span>
                  <span className="font-medium text-navy-900">{a.subject_name}</span>
                  <span className="text-ink-500"> — {a.class_name} · {a.academic_year_name}</span>
                </span>
                <button
                  aria-label="Remove assignment"
                  onClick={() => remove(a)}
                  className="rounded p-1 text-ink-500 hover:bg-gray-100 hover:text-error"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {assignable.length === 0 || years.length === 0 ? (
          <p className="text-sm text-ink-500">
            Add a class with subjects and an academic year before assigning teachers.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px]">
              <Label htmlFor="assign-class-subject">Class &amp; subject</Label>
              <Select
                id="assign-class-subject"
                value={classSubjectId}
                onChange={(e) => setClassSubjectId(e.target.value)}
              >
                {assignable.map((cs) => (
                  <option key={cs.class_subject_id} value={cs.class_subject_id}>
                    {cs.subject_name} — {cs.class_name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-[160px]">
              <Label htmlFor="assign-year">Academic year</Label>
              <Select id="assign-year" value={yearId} onChange={(e) => setYearId(e.target.value)}>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button size="sm" onClick={assign} disabled={busy}>
              <Plus className="h-4 w-4" /> Assign
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
