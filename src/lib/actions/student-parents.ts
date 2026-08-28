"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";

export interface StudentParentRow {
  id: string; // parent_students.id
  parent_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  relationship: string | null;
  is_primary: boolean;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

export async function listStudentParents(studentId: string): Promise<StudentParentRow[]> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("parent_students")
    .select("id, parent_id, relationship, is_primary, parent_profiles(users(first_name, last_name, email))")
    .eq("student_id", studentId);

  type U = { first_name: string; last_name: string; email: string | null };
  type Raw = {
    id: string;
    parent_id: string;
    relationship: string | null;
    is_primary: boolean;
    parent_profiles: { users: U | U[] | null } | { users: U | U[] | null }[] | null;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const profile = one(row.parent_profiles);
    const u = one(profile?.users ?? null);
    return {
      id: row.id,
      parent_id: row.parent_id,
      first_name: u?.first_name ?? "",
      last_name: u?.last_name ?? "",
      email: u?.email ?? null,
      relationship: row.relationship,
      is_primary: row.is_primary,
    };
  });
}

export async function linkParentToStudent(
  studentId: string,
  parentId: string,
  relationship: string,
  isPrimary: boolean
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    if (isPrimary) {
      await supabase.from("parent_students").update({ is_primary: false }).eq("student_id", studentId);
    }

    const { error } = await supabase.from("parent_students").insert({
      student_id: studentId,
      parent_id: parentId,
      relationship: relationship || null,
      is_primary: isPrimary,
    });

    if (error) {
      return {
        success: false,
        error: error.code === "23505" ? "This parent is already linked to this student." : error.message,
      };
    }

    revalidatePath(`/admin/students/${studentId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function unlinkParentFromStudent(linkId: string, studentId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("parent_students").delete().eq("id", linkId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/admin/students/${studentId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
