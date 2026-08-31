"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { createAdminClient } from "@/lib/supabase/admin";
import { synthEmailForLoginId, generateTeacherLoginId, nextIdSequence } from "@/lib/synthetic-login";

export interface TeacherRow {
  id: string; // teacher_profiles.id
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  employee_number: string | null;
  login_id: string | null;
  qualification: string | null;
  specialization: string | null;
  is_active: boolean;
}

export async function getTeacher(teacherProfileId: string): Promise<TeacherRow | null> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("teacher_profiles")
    .select(
      "id, user_id, employee_number, login_id, qualification, specialization, users(first_name, last_name, email, phone, is_active)"
    )
    .eq("id", teacherProfileId)
    .eq("organization_id", organizationId)
    .single();

  if (!data) return null;

  type Raw = {
    id: string;
    user_id: string;
    employee_number: string | null;
    login_id: string | null;
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
    email: row.login_id ? null : u?.email ?? null,
    phone: u?.phone ?? null,
    employee_number: row.employee_number,
    login_id: row.login_id,
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
      "id, user_id, employee_number, login_id, qualification, specialization, users(first_name, last_name, email, phone, is_active)"
    )
    .eq("id", teacherId)
    .single();

  if (!data) return null;

  type Raw = {
    id: string;
    user_id: string;
    employee_number: string | null;
    login_id: string | null;
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
    email: row.login_id ? null : u?.email ?? null,
    phone: u?.phone ?? null,
    employee_number: row.employee_number,
    login_id: row.login_id,
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
      "id, user_id, employee_number, login_id, qualification, specialization, users(first_name, last_name, email, phone, is_active)"
    )
    .eq("organization_id", organizationId);

  type Raw = {
    id: string;
    user_id: string;
    employee_number: string | null;
    login_id: string | null;
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
        email: row.login_id ? null : u?.email ?? null,
        phone: u?.phone ?? null,
        employee_number: row.employee_number,
        login_id: row.login_id,
        qualification: row.qualification,
        specialization: row.specialization,
        is_active: u?.is_active ?? true,
      };
    })
    .sort((a, b) => a.last_name.localeCompare(b.last_name));
}

export async function createTeacher(input: {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  employee_number: string;
  qualification: string;
  specialization: string;
}): Promise<ActionResult<{ tempPassword: string; loginId: string | null; teacherId: string }>> {
  try {
    const { organizationId } = await requireAdmin();

    if (!input.first_name || !input.last_name) {
      return { success: false, error: "First name and last name are required." };
    }
    if (!input.phone || input.phone.trim().length < 6) {
      return { success: false, error: "A phone number is required — it becomes this teacher's login password." };
    }

    const admin = createAdminClient();
    // Password policy: every non-Super-Admin login uses the person's own
    // phone number as their password, so it's something they already know.
    const tempPassword = input.phone.trim();

    let loginEmail = input.email;
    let loginId: string | null = null;

    if (!loginEmail) {
      const sequence = await nextIdSequence(admin, "teacher_profiles", "login_id", organizationId);
      loginId = generateTeacherLoginId(sequence);
      loginEmail = synthEmailForLoginId(loginId);
    }

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: loginEmail,
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
      email: loginEmail,
      phone: input.phone || null,
      current_password: tempPassword,
    });

    if (userError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return {
        success: false,
        error: userError.code === "23505" ? "That email is already in use by another account." : userError.message,
      };
    }

    const { data: profile, error: profileError } = await admin
      .from("teacher_profiles")
      .insert({
        user_id: authUser.user.id,
        organization_id: organizationId,
        employee_number: input.employee_number || null,
        login_id: loginId,
        qualification: input.qualification || null,
        specialization: input.specialization || null,
      })
      .select("id")
      .single();

    if (profileError || !profile) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return {
        success: false,
        error: profileError?.code === "23505" ? "That login ID is already in use — try again." : profileError?.message ?? "Could not create the teacher profile.",
      };
    }

    revalidatePath("/admin/teachers");
    return { success: true, data: { tempPassword, loginId, teacherId: (profile as { id: string }).id } };
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

export async function updateTeacher(
  teacherProfileId: string,
  userId: string,
  input: {
    first_name: string;
    last_name: string;
    phone: string;
    employee_number: string;
    qualification: string;
    specialization: string;
  }
): Promise<ActionResult> {
  try {
    const { organizationId } = await requireAdmin();

    if (!input.first_name || !input.last_name) {
      return { success: false, error: "First name and last name are required." };
    }

    const admin = createAdminClient();

    const { data: existing } = await admin.from("users").select("phone").eq("id", userId).single();
    const previousPhone = (existing as { phone: string | null } | null)?.phone ?? null;
    const newPhone = input.phone.trim() || null;

    const { error: userError } = await admin
      .from("users")
      .update({
        first_name: input.first_name,
        last_name: input.last_name,
        phone: newPhone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .eq("organization_id", organizationId);

    if (userError) return { success: false, error: userError.message };

    const { error: profileError } = await admin
      .from("teacher_profiles")
      .update({
        employee_number: input.employee_number || null,
        qualification: input.qualification || null,
        specialization: input.specialization || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", teacherProfileId)
      .eq("organization_id", organizationId);

    if (profileError) return { success: false, error: profileError.message };

    // Password policy: a teacher's password is their phone number — keep
    // it in sync the moment the phone actually changes.
    if (newPhone && newPhone !== previousPhone) {
      await admin.auth.admin.updateUserById(userId, { password: newPhone });
      await admin.from("users").update({ current_password: newPhone }).eq("id", userId);
    }

    revalidatePath(`/admin/teachers/${teacherProfileId}`);
    revalidatePath("/admin/teachers");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// teacher_profiles.user_id is NOT NULL with ON DELETE CASCADE from users,
// and every table referencing teacher_profiles.id (assignments, sessions,
// attendance, assessments, timetable, ...) is CASCADE or SET NULL — deleting
// the auth user is enough; Postgres removes the rest.
export async function deleteTeacher(userId: string): Promise<ActionResult> {
  try {
    const { organizationId } = await requireAdmin();
    const admin = createAdminClient();

    const { data: user } = await admin
      .from("users")
      .select("id")
      .eq("id", userId)
      .eq("organization_id", organizationId)
      .eq("role", "TEACHER")
      .single();

    if (!user) return { success: false, error: "Teacher not found." };

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/teachers");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
