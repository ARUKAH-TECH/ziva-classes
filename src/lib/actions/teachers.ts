"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { createAdminClient } from "@/lib/supabase/admin";

export interface TeacherRow {
  id: string; // teacher_profiles.id
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  employee_number: string | null;
  qualification: string | null;
  specialization: string | null;
  is_active: boolean;
}

export async function getTeacher(teacherProfileId: string): Promise<TeacherRow | null> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("teacher_profiles")
    .select(
      "id, user_id, employee_number, qualification, specialization, users(first_name, last_name, email, phone, is_active)"
    )
    .eq("id", teacherProfileId)
    .eq("organization_id", organizationId)
    .single();

  if (!data) return null;

  type Raw = {
    id: string;
    user_id: string;
    employee_number: string | null;
    qualification: string | null;
    specialization: string | null;
    users:
      | { first_name: string; last_name: string; email: string | null; phone: string | null; is_active: boolean }
      | { first_name: string; last_name: string; email: string | null; phone: string | null; is_active: boolean }[]
      | null;
  };
  const row = data as Raw;
  const u = Array.isArray(row.users) ? row.users[0] : row.users;

  return {
    id: row.id,
    user_id: row.user_id,
    first_name: u?.first_name ?? "",
    last_name: u?.last_name ?? "",
    email: u?.email ?? null,
    phone: u?.phone ?? null,
    employee_number: row.employee_number,
    qualification: row.qualification,
    specialization: row.specialization,
    is_active: u?.is_active ?? true,
  };
}

export async function getMyTeacherProfile(): Promise<TeacherRow | null> {
  const { supabase, teacherId } = await requireTeacher();

  const { data } = await supabase
    .from("teacher_profiles")
    .select(
      "id, user_id, employee_number, qualification, specialization, users(first_name, last_name, email, phone, is_active)"
    )
    .eq("id", teacherId)
    .single();

  if (!data) return null;

  type Raw = {
    id: string;
    user_id: string;
    employee_number: string | null;
    qualification: string | null;
    specialization: string | null;
    users:
      | { first_name: string; last_name: string; email: string | null; phone: string | null; is_active: boolean }
      | { first_name: string; last_name: string; email: string | null; phone: string | null; is_active: boolean }[]
      | null;
  };
  const row = data as Raw;
  const u = Array.isArray(row.users) ? row.users[0] : row.users;

  return {
    id: row.id,
    user_id: row.user_id,
    first_name: u?.first_name ?? "",
    last_name: u?.last_name ?? "",
    email: u?.email ?? null,
    phone: u?.phone ?? null,
    employee_number: row.employee_number,
    qualification: row.qualification,
    specialization: row.specialization,
    is_active: u?.is_active ?? true,
  };
}

export async function listTeachers(): Promise<TeacherRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("teacher_profiles")
    .select(
      "id, user_id, employee_number, qualification, specialization, users(first_name, last_name, email, phone, is_active)"
    )
    .eq("organization_id", organizationId);

  type Raw = {
    id: string;
    user_id: string;
    employee_number: string | null;
    qualification: string | null;
    specialization: string | null;
    users:
      | { first_name: string; last_name: string; email: string | null; phone: string | null; is_active: boolean }
      | { first_name: string; last_name: string; email: string | null; phone: string | null; is_active: boolean }[]
      | null;
  };

  return ((data as Raw[]) ?? [])
    .map((row) => {
      const u = Array.isArray(row.users) ? row.users[0] : row.users;
      return {
        id: row.id,
        user_id: row.user_id,
        first_name: u?.first_name ?? "",
        last_name: u?.last_name ?? "",
        email: u?.email ?? null,
        phone: u?.phone ?? null,
        employee_number: row.employee_number,
        qualification: row.qualification,
        specialization: row.specialization,
        is_active: u?.is_active ?? true,
      };
    })
    .sort((a, b) => a.last_name.localeCompare(b.last_name));
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function createTeacher(input: {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  employee_number: string;
  qualification: string;
  specialization: string;
}): Promise<ActionResult<{ tempPassword: string }>> {
  try {
    const { organizationId } = await requireAdmin();

    if (!input.first_name || !input.last_name || !input.email) {
      return { success: false, error: "First name, last name, and email are required." };
    }

    const admin = createAdminClient();
    const tempPassword = generateTempPassword();

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: input.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { first_name: input.first_name, last_name: input.last_name, role: "TEACHER" },
    });

    if (authError || !authUser.user) {
      return { success: false, error: authError?.message ?? "Could not create the account." };
    }

    const { error: userError } = await admin.from("users").insert({
      id: authUser.user.id,
      organization_id: organizationId,
      role: "TEACHER",
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      phone: input.phone || null,
    });

    if (userError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: userError.message };
    }

    const { error: profileError } = await admin.from("teacher_profiles").insert({
      user_id: authUser.user.id,
      organization_id: organizationId,
      employee_number: input.employee_number || null,
      qualification: input.qualification || null,
      specialization: input.specialization || null,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: profileError.message };
    }

    revalidatePath("/admin/teachers");
    return { success: true, data: { tempPassword } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function setTeacherActive(userId: string, isActive: boolean): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("users")
      .update({ is_active: isActive })
      .eq("id", userId)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/teachers");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
