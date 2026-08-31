"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { requireParent } from "@/lib/auth/require-parent";
import { createAdminClient } from "@/lib/supabase/admin";
import { synthEmailForLoginId, generateParentLoginId, nextIdSequence } from "@/lib/synthetic-login";

export interface ParentRow {
  id: string; // parent_profiles.id
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  occupation: string | null;
  address: string | null;
  login_id: string | null;
  is_active: boolean;
}

export async function listParents(): Promise<ParentRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("parent_profiles")
    .select("id, user_id, occupation, address, login_id, users(first_name, last_name, email, phone, is_active)")
    .eq("organization_id", organizationId);

  type U = { first_name: string; last_name: string; email: string | null; phone: string | null; is_active: boolean };
  type Raw = {
    id: string;
    user_id: string;
    occupation: string | null;
    address: string | null;
    login_id: string | null;
    users: U | U[] | null;
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
        occupation: row.occupation,
        address: row.address,
        login_id: row.login_id,
        is_active: u?.is_active ?? true,
      };
    })
    .sort((a, b) => a.last_name.localeCompare(b.last_name));
}

export async function getMyParentProfile(): Promise<ParentRow | null> {
  const { supabase, parentId } = await requireParent();

  const { data } = await supabase
    .from("parent_profiles")
    .select("id, user_id, occupation, address, login_id, users(first_name, last_name, email, phone, is_active)")
    .eq("id", parentId)
    .single();

  if (!data) return null;

  type U = { first_name: string; last_name: string; email: string | null; phone: string | null; is_active: boolean };
  type Raw = {
    id: string;
    user_id: string;
    occupation: string | null;
    address: string | null;
    login_id: string | null;
    users: U | U[] | null;
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
    occupation: row.occupation,
    address: row.address,
    login_id: row.login_id,
    is_active: u?.is_active ?? true,
  };
}

export async function createParent(input: {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  occupation: string;
  address: string;
}): Promise<ActionResult<{ tempPassword: string; loginId: string | null; parentId: string }>> {
  try {
    const { organizationId } = await requireAdmin();

    if (!input.first_name || !input.last_name) {
      return { success: false, error: "First name and last name are required." };
    }
    if (!input.phone || input.phone.trim().length < 6) {
      return { success: false, error: "A phone number is required — it becomes this parent's login password." };
    }

    const admin = createAdminClient();
    // Password policy: every non-Super-Admin login uses the person's own
    // phone number as their password, so it's something they already know.
    const tempPassword = input.phone.trim();

    let loginEmail = input.email;
    let loginId: string | null = null;

    if (!loginEmail) {
      const sequence = await nextIdSequence(admin, "parent_profiles", "login_id", organizationId);
      loginId = generateParentLoginId(sequence);
      loginEmail = synthEmailForLoginId(loginId);
    }

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: loginEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { first_name: input.first_name, last_name: input.last_name, role: "PARENT" },
    });

    if (authError || !authUser.user) {
      return { success: false, error: authError?.message ?? "Could not create the account." };
    }

    const { error: userError } = await admin.from("users").insert({
      id: authUser.user.id,
      organization_id: organizationId,
      role: "PARENT",
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
      .from("parent_profiles")
      .insert({
        user_id: authUser.user.id,
        organization_id: organizationId,
        occupation: input.occupation || null,
        address: input.address || null,
        login_id: loginId,
      })
      .select("id")
      .single();

    if (profileError || !profile) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return {
        success: false,
        error: profileError?.code === "23505" ? "That login ID is already in use — try again." : profileError?.message ?? "Could not create the parent profile.",
      };
    }

    revalidatePath("/admin/parents");
    return { success: true, data: { tempPassword, loginId, parentId: (profile as { id: string }).id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function setParentActive(userId: string, isActive: boolean): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("users")
      .update({ is_active: isActive })
      .eq("id", userId)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/parents");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateParent(
  parentProfileId: string,
  userId: string,
  input: {
    first_name: string;
    last_name: string;
    phone: string;
    occupation: string;
    address: string;
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
      .from("parent_profiles")
      .update({
        occupation: input.occupation || null,
        address: input.address || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parentProfileId)
      .eq("organization_id", organizationId);

    if (profileError) return { success: false, error: profileError.message };

    // Password policy: a parent's password is their phone number, and their
    // children's own logins (if any) use that same phone — keep both in
    // sync the moment the phone actually changes.
    if (newPhone && newPhone !== previousPhone) {
      await admin.auth.admin.updateUserById(userId, { password: newPhone });
      await admin.from("users").update({ current_password: newPhone }).eq("id", userId);

      const { data: links } = await admin
        .from("parent_students")
        .select("student_profiles(optional_user_id)")
        .eq("parent_id", parentProfileId);
      type S = { optional_user_id: string | null };
      type Raw = { student_profiles: S | S[] | null };
      const studentUserIds = ((links as Raw[]) ?? [])
        .map((l) => (Array.isArray(l.student_profiles) ? l.student_profiles[0] : l.student_profiles))
        .map((s) => s?.optional_user_id)
        .filter((id): id is string => !!id);

      for (const studentUserId of studentUserIds) {
        await admin.auth.admin.updateUserById(studentUserId, { password: newPhone });
        await admin.from("users").update({ current_password: newPhone }).eq("id", studentUserId);
      }
    }

    revalidatePath("/admin/parents");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// parent_profiles.user_id is NOT NULL with ON DELETE CASCADE from users, and
// parent_students (the only table referencing parent_profiles.id) is also
// CASCADE — deleting the auth user is enough; Postgres removes the rest,
// including this parent's links to their children (not the children
// themselves).
export async function deleteParent(userId: string): Promise<ActionResult> {
  try {
    const { organizationId } = await requireAdmin();
    const admin = createAdminClient();

    const { data: user } = await admin
      .from("users")
      .select("id")
      .eq("id", userId)
      .eq("organization_id", organizationId)
      .eq("role", "PARENT")
      .single();

    if (!user) return { success: false, error: "Parent not found." };

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/parents");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
