import "server-only";
import { createClient } from "@/lib/supabase/server";

export class NotAuthorizedError extends Error {
  constructor(message = "You are not authorized to perform this action.") {
    super(message);
    this.name = "NotAuthorizedError";
  }
}

// Server Action guard: fails fast with a clear message instead of a cryptic
// RLS denial. This is a UX/DX convenience — Postgres RLS (schema.sql +
// rls_policies.sql + 003_rls_org_scoping_fix.sql) is still the real
// enforcement boundary underneath every query these actions make.
export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new NotAuthorizedError("You must be signed in.");

  const { data } = await supabase
    .from("users")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  const profile = data as { role: string; organization_id: string | null } | null;

  if (!profile || (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN")) {
    throw new NotAuthorizedError("Only administrators can perform this action.");
  }

  if (!profile.organization_id) {
    throw new NotAuthorizedError("Your account has no organization assigned.");
  }

  return { supabase, userId: user.id, organizationId: profile.organization_id };
}

// Stricter than requireAdmin — SUPER_ADMIN only, not ADMIN. Used for the
// current-password-viewing feature specifically: the school owner asked
// for password visibility but wanted it restricted to the Super Admin
// account, not every admin.
export async function requireSuperAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new NotAuthorizedError("You must be signed in.");

  const { data } = await supabase
    .from("users")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  const profile = data as { role: string; organization_id: string | null } | null;

  if (!profile || profile.role !== "SUPER_ADMIN") {
    throw new NotAuthorizedError("Only the Super Admin can perform this action.");
  }

  if (!profile.organization_id) {
    throw new NotAuthorizedError("Your account has no organization assigned.");
  }

  return { supabase, userId: user.id, organizationId: profile.organization_id };
}

// Server Action guard for read-only lookups any signed-in org member may
// see (e.g. academic years/terms) — matches the "*_org_access" SELECT
// policies in rls_policies.sql, which grant read access org-wide while
// admin_manage policies keep writes admin-only. Do not use this to guard
// a write action.
export async function requireOrgMember() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new NotAuthorizedError("You must be signed in.");

  const { data } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const profile = data as { organization_id: string | null } | null;

  if (!profile?.organization_id) {
    throw new NotAuthorizedError("Your account has no organization assigned.");
  }

  return { supabase, userId: user.id, organizationId: profile.organization_id };
}

export type ActionResult<T = void> =
  | { success: true; data: T; warning?: string }
  | { success: false; error: string };
