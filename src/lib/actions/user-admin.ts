"use server";

import { requireAdmin, requireSuperAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

function generateTempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// A student's own login uses their linked parent's phone number (mirrors
// the lookup in students.ts, but keyed from the student's users.id rather
// than student_profiles.id since that's what resetUserPassword is given).
async function findParentPhoneForStudentUser(
  admin: ReturnType<typeof createAdminClient>,
  studentUserId: string
): Promise<string | null> {
  const { data: student } = await admin
    .from("student_profiles")
    .select("id")
    .eq("optional_user_id", studentUserId)
    .single();
  const studentProfileId = (student as { id: string } | null)?.id;
  if (!studentProfileId) return null;

  const { data } = await admin
    .from("parent_students")
    .select("parent_profiles(users(phone))")
    .eq("student_id", studentProfileId)
    .limit(1);

  type U = { phone: string | null } | { phone: string | null }[] | null;
  type Raw = { parent_profiles: { users: U } | { users: U }[] | null };
  const row = ((data as Raw[] | null) ?? [])[0];
  const profile = Array.isArray(row?.parent_profiles) ? row?.parent_profiles[0] : row?.parent_profiles;
  const u = Array.isArray(profile?.users) ? profile?.users[0] : profile?.users;
  return u?.phone || null;
}

// Shared by the Teacher/Parent/Student detail views' "Reset password" button.
// Lets the school's own admin directly set a new password via Supabase's
// admin API — no Supabase dashboard access needed. The org check matters:
// without it, userId alone would let an admin reset a password for a user
// in a different organization.
//
// Password policy: every non-Super-Admin login's password is the person's
// own phone number (a student's login uses their parent's phone, since most
// JHS/SHS students don't have their own) — falls back to a random password
// only when no phone is on file yet.
export async function resetUserPassword(userId: string): Promise<ActionResult<{ tempPassword: string }>> {
  try {
    const { organizationId } = await requireAdmin();
    const admin = createAdminClient();

    const { data: target } = await admin
      .from("users")
      .select("id, role, phone")
      .eq("id", userId)
      .eq("organization_id", organizationId)
      .single();

    if (!target) return { success: false, error: "User not found." };
    const row = target as { id: string; role: string; phone: string | null };

    if (row.role === "SUPER_ADMIN") {
      return { success: false, error: "The Super Admin password isn't managed from here." };
    }

    const newPassword =
      row.role === "STUDENT"
        ? (await findParentPhoneForStudentUser(admin, userId)) ?? generateTempPassword()
        : row.phone || generateTempPassword();

    const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) return { success: false, error: error.message };

    // Best-effort — the password itself is already changed even if this
    // write fails, so a failure here shouldn't surface as a reset failure.
    await admin.from("users").update({ current_password: newPassword }).eq("id", userId);

    return { success: true, data: { tempPassword: newPassword } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// Whether the signed-in caller is the Super Admin — used to decide whether
// to even render a "View password" button, not as the real access control
// (getCurrentPassword enforces that itself via requireSuperAdmin).
export async function isSuperAdmin(): Promise<boolean> {
  try {
    await requireSuperAdmin();
    return true;
  } catch {
    return false;
  }
}

// Super-Admin-only: looks up the plaintext password last set for this
// account (via account creation or Reset password), stored specifically
// for this feature — see migration 015 for the tradeoff this represents.
export async function getCurrentPassword(userId: string): Promise<ActionResult<{ password: string | null }>> {
  try {
    const { organizationId } = await requireSuperAdmin();
    const admin = createAdminClient();

    const { data } = await admin
      .from("users")
      .select("current_password")
      .eq("id", userId)
      .eq("organization_id", organizationId)
      .single();

    if (!data) return { success: false, error: "User not found." };

    return { success: true, data: { password: (data as { current_password: string | null }).current_password } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
