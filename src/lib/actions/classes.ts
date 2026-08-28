"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";

export interface ClassRow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  academic_level_id: string;
  academic_level_name: string;
  subject_count: number;
}

export interface ClassSubjectRow {
  id: string; // class_subjects.id
  subject_id: string;
  subject_name: string;
}

export async function getClass(id: string): Promise<{
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  academic_level_name: string;
} | null> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("classes")
    .select("id, name, description, active, academic_levels(name)")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (!data) return null;

  type Raw = {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    academic_levels: { name: string } | { name: string }[] | null;
  };
  const row = data as Raw;
  const level = Array.isArray(row.academic_levels) ? row.academic_levels[0] : row.academic_levels;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    active: row.active,
    academic_level_name: level?.name ?? "—",
  };
}

export async function listClasses(): Promise<ClassRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("classes")
    .select("id, name, description, active, academic_level_id, academic_levels(name), class_subjects(id)")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  type Raw = {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    academic_level_id: string;
    academic_levels: { name: string } | { name: string }[] | null;
    class_subjects: { id: string }[] | null;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const level = Array.isArray(row.academic_levels) ? row.academic_levels[0] : row.academic_levels;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      active: row.active,
      academic_level_id: row.academic_level_id,
      academic_level_name: level?.name ?? "—",
      subject_count: row.class_subjects?.length ?? 0,
    };
  });
}

export async function createClass(input: {
  name: string;
  academic_level_id: string;
  description: string;
}): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    if (!input.name || !input.academic_level_id) {
      return { success: false, error: "Class name and academic level are required." };
    }

    const { error } = await supabase.from("classes").insert({
      organization_id: organizationId,
      academic_level_id: input.academic_level_id,
      name: input.name,
      description: input.description || null,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/classes");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function setClassActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("classes")
      .update({ active })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/classes");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function listClassSubjects(classId: string): Promise<ClassSubjectRow[]> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("class_subjects")
    .select("id, subject_id, subjects(name)")
    .eq("class_id", classId);

  type Raw = { id: string; subject_id: string; subjects: { name: string } | { name: string }[] | null };

  return ((data as Raw[]) ?? []).map((row) => {
    const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
    return { id: row.id, subject_id: row.subject_id, subject_name: subject?.name ?? "—" };
  });
}

export async function addClassSubject(classId: string, subjectId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("class_subjects")
      .insert({ class_id: classId, subject_id: subjectId });

    if (error) {
      return {
        success: false,
        error: error.code === "23505" ? "This subject is already assigned to the class." : error.message,
      };
    }

    revalidatePath("/admin/classes");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function removeClassSubject(classSubjectId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("class_subjects").delete().eq("id", classSubjectId);

    if (error) {
      return {
        success: false,
        error:
          error.code === "23503"
            ? "Students or teachers are still linked to this subject in this class."
            : error.message,
      };
    }

    revalidatePath("/admin/classes");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
