"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export interface StudentParentRow {
  id: string; // parent_students.id
  parent_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  login_id: string | null;
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
    .select(
      "id, parent_id, relationship, is_primary, parent_profiles(login_id, users(first_name, last_name, email))"
    )
    .eq("student_id", studentId);

  type U = { first_name: string; last_name: string; email: string | null };
  type Raw = {
    id: string;
    parent_id: string;
    relationship: string | null;
    is_primary: boolean;
    parent_profiles:
      | { login_id: string | null; users: U | U[] | null }
      | { login_id: string | null; users: U | U[] | null }[]
      | null;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const profile = one(row.parent_profiles);
    const u = one(profile?.users ?? null);
    return {
      id: row.id,
      parent_id: row.parent_id,
      first_name: u?.first_name ?? "",
      last_name: u?.last_name ?? "",
      email: profile?.login_id ? null : u?.email ?? null,
      login_id: profile?.login_id ?? null,
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

    // Password policy: a student's login uses their parent's phone number.
    // If the student already has their own login, sync it now that a
    // parent (and their phone) is known — covers students created before
    // any parent was linked.
    const admin = createAdminClient();
    const [{ data: student }, { data: parent }] = await Promise.all([
      admin.from("student_profiles").select("optional_user_id").eq("id", studentId).single(),
      admin.from("parent_profiles").select("users(phone)").eq("id", parentId).single(),
    ]);
    const studentUserId = (student as { optional_user_id: string | null } | null)?.optional_user_id;
    const parentUsersRaw = (parent as { users: { phone: string | null } | { phone: string | null }[] | null } | null)
      ?.users;
    const parentPhone = Array.isArray(parentUsersRaw) ? parentUsersRaw[0]?.phone : parentUsersRaw?.phone;

    if (studentUserId && parentPhone) {
      const { error: pwError } = await admin.auth.admin.updateUserById(studentUserId, { password: parentPhone });
      if (!pwError) {
        await admin.from("users").update({ current_password: parentPhone }).eq("id", studentUserId);
      }
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
