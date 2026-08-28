"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export interface StudentSubjectRow {
  id: string; // student_subjects.id
  class_subject_id: string;
  subject_name: string;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

// The subjects a student can be enrolled in are exactly the subjects
// assigned to their current class (class_subjects) — this keeps the UI
// honest about the real teacher_assignments/class_subjects relationship
// per §52, rather than letting a student "take" a subject unrelated to
// their class.
export async function listAvailableClassSubjectsForStudent(
  classId: string
): Promise<{ class_subject_id: string; subject_name: string }[]> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("class_subjects")
    .select("id, subjects(name)")
    .eq("class_id", classId);

  type Raw = { id: string; subjects: { name: string } | { name: string }[] | null };
  return ((data as Raw[]) ?? []).map((row) => ({
    class_subject_id: row.id,
    subject_name: one(row.subjects)?.name ?? "—",
  }));
}

// Read-only, shared by admin/teacher/parent/student — RLS scopes
// visibility per role; this just needs a signed-in session.
export async function listStudentSubjects(
  studentId: string,
  academicYearId: string
): Promise<StudentSubjectRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("student_subjects")
    .select("id, class_subject_id, class_subjects(subjects(name))")
    .eq("student_id", studentId)
    .eq("academic_year_id", academicYearId);

  type Raw = {
    id: string;
    class_subject_id: string;
    class_subjects: { subjects: { name: string } | { name: string }[] | null } | { subjects: { name: string } | { name: string }[] | null }[] | null;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const cs = one(row.class_subjects);
    return {
      id: row.id,
      class_subject_id: row.class_subject_id,
      subject_name: one(cs?.subjects ?? null)?.name ?? "—",
    };
  });
}

export async function addStudentSubject(
  studentId: string,
  classSubjectId: string,
  academicYearId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("student_subjects").insert({
      student_id: studentId,
      class_subject_id: classSubjectId,
      academic_year_id: academicYearId,
    });

    if (error) {
      return {
        success: false,
        error: error.code === "23505" ? "Student is already enrolled in this subject." : error.message,
      };
    }

    revalidatePath(`/admin/students/${studentId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function removeStudentSubject(studentSubjectId: string, studentId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("student_subjects").delete().eq("id", studentSubjectId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/admin/students/${studentId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
