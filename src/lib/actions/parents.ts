"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { requireParent } from "@/lib/auth/require-parent";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ParentRow {
  id: string; // parent_profiles.id
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  occupation: string | null;
  address: string | null;
  is_active: boolean;
}

export async function listParents(): Promise<ParentRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("parent_profiles")
    .select("id, user_id, occupation, address, users(first_name, last_name, email, phone, is_active)")
    .eq("organization_id", organizationId);

  type U = { first_name: string; last_name: string; email: string | null; phone: string | null; is_active: boolean };
  type Raw = {
    id: string;
    user_id: string;
    occupation: string | null;
    address: string | null;
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
        email: u?.email ?? null,
        phone: u?.phone ?? null,
        occupation: row.occupation,
        address: row.address,
        is_active: u?.is_active ?? true,
      };
    })
    .sort((a, b) => a.last_name.localeCompare(b.last_name));
}

export async function getMyParentProfile(): Promise<ParentRow | null> {
  const { supabase, parentId } = await requireParent();

  const { data } = await supabase
    .from("parent_profiles")
    .select("id, user_id, occupation, address, users(first_name, last_name, email, phone, is_active)")
    .eq("id", parentId)
    .single();

  if (!data) return null;

  type U = { first_name: string; last_name: string; email: string | null; phone: string | null; is_active: boolean };
  type Raw = {
    id: string;
    user_id: string;
    occupation: string | null;
    address: string | null;
    users: U | U[] | null;
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
    occupation: row.occupation,
    address: row.address,
    is_active: u?.is_active ?? true,
  };
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function createParent(input: {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  occupation: string;
  address: string;
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
      email: input.email,
      phone: input.phone || null,
    });

    if (userError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: userError.message };
    }

    const { error: profileError } = await admin.from("parent_profiles").insert({
      user_id: authUser.user.id,
      organization_id: organizationId,
      occupation: input.occupation || null,
      address: input.address || null,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: profileError.message };
    }

    revalidatePath("/admin/parents");
    return { success: true, data: { tempPassword } };
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
