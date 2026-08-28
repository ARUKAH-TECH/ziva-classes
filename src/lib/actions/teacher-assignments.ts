"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { requireTeacher } from "@/lib/auth/require-teacher";

export interface TeacherAssignmentRow {
  id: string;
  class_subject_id: string;
  class_name: string;
  subject_name: string;
  academic_year_id: string;
  academic_year_name: string;
  active: boolean;
}

export interface AssignableClassSubject {
  class_subject_id: string;
  class_name: string;
  subject_name: string;
}

export async function listTeacherAssignments(teacherId: string): Promise<TeacherAssignmentRow[]> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("teacher_assignments")
    .select(
      "id, class_subject_id, active, academic_year_id, academic_years(name), class_subjects(classes(name), subjects(name))"
    )
    .eq("teacher_id", teacherId);

  type Nested = { name: string } | { name: string }[] | null;
  type Raw = {
    id: string;
    class_subject_id: string;
    active: boolean;
    academic_year_id: string;
    academic_years: Nested;
    class_subjects: { classes: Nested; subjects: Nested } | { classes: Nested; subjects: Nested }[] | null;
  };

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  return ((data as Raw[]) ?? []).map((row) => {
    const cs = one(row.class_subjects);
    const cls = one(cs?.classes ?? null);
    const subj = one(cs?.subjects ?? null);
    const year = one(row.academic_years);
    return {
      id: row.id,
      class_subject_id: row.class_subject_id,
      class_name: cls?.name ?? "—",
      subject_name: subj?.name ?? "—",
      academic_year_id: row.academic_year_id,
      academic_year_name: year?.name ?? "—",
      active: row.active,
    };
  });
}

export async function listMyTeacherAssignments(): Promise<TeacherAssignmentRow[]> {
  const { supabase, teacherId } = await requireTeacher();

  const { data } = await supabase
    .from("teacher_assignments")
    .select(
      "id, class_subject_id, active, academic_year_id, academic_years(name), class_subjects(classes(name), subjects(name))"
    )
    .eq("teacher_id", teacherId)
    .eq("active", true);

  type Nested = { name: string } | { name: string }[] | null;
  type Raw = {
    id: string;
    class_subject_id: string;
    active: boolean;
    academic_year_id: string;
    academic_years: Nested;
    class_subjects: { classes: Nested; subjects: Nested } | { classes: Nested; subjects: Nested }[] | null;
  };

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  return ((data as Raw[]) ?? []).map((row) => {
    const cs = one(row.class_subjects);
    const cls = one(cs?.classes ?? null);
    const subj = one(cs?.subjects ?? null);
    const year = one(row.academic_years);
    return {
      id: row.id,
      class_subject_id: row.class_subject_id,
      class_name: cls?.name ?? "—",
      subject_name: subj?.name ?? "—",
      academic_year_id: row.academic_year_id,
      academic_year_name: year?.name ?? "—",
      active: row.active,
    };
  });
}

// class_subjects the org has, for the "assign a subject" picker — every
// class+subject combination, regardless of whether this teacher already
// has it (the create action rejects duplicates via the unique constraint).
export async function listAssignableClassSubjects(): Promise<AssignableClassSubject[]> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("class_subjects")
    .select("id, classes!inner(name, organization_id), subjects(name)")
    .eq("classes.organization_id", organizationId);

  type Nested = { name: string } | { name: string }[] | null;
  type Raw = { id: string; classes: Nested; subjects: Nested };
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  return ((data as Raw[]) ?? []).map((row) => ({
    class_subject_id: row.id,
    class_name: one(row.classes)?.name ?? "—",
    subject_name: one(row.subjects)?.name ?? "—",
  }));
}

export async function createTeacherAssignment(input: {
  teacher_id: string;
  class_subject_id: string;
  academic_year_id: string;
}): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("teacher_assignments").insert({
      teacher_id: input.teacher_id,
      class_subject_id: input.class_subject_id,
      academic_year_id: input.academic_year_id,
    });

    if (error) {
      return {
        success: false,
        error:
          error.code === "23505"
            ? "This teacher is already assigned to this class and subject for the selected year."
            : error.message,
      };
    }

    revalidatePath("/admin/teachers");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function removeTeacherAssignment(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("teacher_assignments").delete().eq("id", id);

    if (error) {
      return {
        success: false,
        error:
          error.code === "23503"
            ? "This assignment has attendance, assessments, or scores recorded against it. Deactivate it instead of deleting."
            : error.message,
      };
    }

    revalidatePath("/admin/teachers");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
