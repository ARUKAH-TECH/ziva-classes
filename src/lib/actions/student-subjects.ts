"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export interface StudentSubjectRow {
  id: string; // student_subjects.id
  class_subject_id: string;
  subject_name: string;
  teacher_name: string | null;
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
    .select(
      "id, class_subject_id, class_subjects(subjects(name), teacher_assignments(active, academic_year_id, teacher_profiles(users(first_name, last_name))))"
    )
    .eq("student_id", studentId)
    .eq("academic_year_id", academicYearId);

  type TA = {
    active: boolean;
    academic_year_id: string;
    teacher_profiles: { users: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null } | { users: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null }[] | null;
  };
  type CS = {
    subjects: { name: string } | { name: string }[] | null;
    teacher_assignments: TA | TA[] | null;
  };
  type Raw = {
    id: string;
    class_subject_id: string;
    class_subjects: CS | CS[] | null;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const cs = one(row.class_subjects);
    const assignments = Array.isArray(cs?.teacher_assignments)
      ? cs.teacher_assignments
      : cs?.teacher_assignments
      ? [cs.teacher_assignments]
      : [];
    const activeAssignment = assignments.find((a) => a.active && a.academic_year_id === academicYearId);
    const teacherUser = one(activeAssignment?.teacher_profiles ?? null)?.users ?? null;
    const teacher = one(teacherUser);
    return {
      id: row.id,
      class_subject_id: row.class_subject_id,
      subject_name: one(cs?.subjects ?? null)?.name ?? "—",
      teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : null,
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

    // Auto-bill: if this class/subject already has an active fee set for
    // the current term, charge the student immediately instead of waiting
    // for a manual "Generate charges" run — best-effort, so a hiccup here
    // doesn't undo the subject enrollment that already succeeded above.
    try {
      const { data: term } = await supabase
        .from("terms")
        .select("id")
        .eq("academic_year_id", academicYearId)
        .eq("is_current", true)
        .maybeSingle();
      const termId = (term as { id: string } | null)?.id;

      if (termId) {
        const { data: feeStructure } = await supabase
          .from("fee_structures")
          .select("id, amount")
          .eq("class_subject_id", classSubjectId)
          .eq("term_id", termId)
          .eq("fee_type", "SUBJECT")
          .eq("active", true)
          .maybeSingle();
        const fs = feeStructure as { id: string; amount: number } | null;

        if (fs) {
          const { data: existingCharge } = await supabase
            .from("student_charges")
            .select("id")
            .eq("student_id", studentId)
            .eq("fee_structure_id", fs.id)
            .maybeSingle();

          if (!existingCharge) {
            await supabase
              .from("student_charges")
              .insert({ student_id: studentId, fee_structure_id: fs.id, amount_due: fs.amount });
          }
        }
      }
    } catch {
      // Best-effort — the subject enrollment itself already succeeded;
      // admin can still generate the charge later from Fees & Payments.
    }

    revalidatePath(`/admin/students/${studentId}`);
    revalidatePath(`/admin/students/${studentId}?tab=fees`);
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
