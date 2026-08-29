"use server";

// Unauthenticated lookups used by the login page's ID tab to resolve a
// Student ID / Teacher ID / Parent ID to the synthetic internal email its
// Supabase auth account actually uses. Callable pre-login, so these must
// stay minimal: given an identifier, return only the email needed to
// attempt sign-in — nothing else about the account.

import { createAdminClient } from "@/lib/supabase/admin";

function pickEmail(row: { users: { email: string | null } | { email: string | null }[] | null } | null): string | null {
  if (!row) return null;
  const u = Array.isArray(row.users) ? row.users[0] : row.users;
  return u?.email ?? null;
}

export async function resolveStudentLoginEmail(studentNumber: string): Promise<string | null> {
  const trimmed = studentNumber.trim();
  if (!trimmed) return null;

  const admin = createAdminClient();

  const { data } = await admin
    .from("student_profiles")
    .select("optional_user_id, users(email)")
    .ilike("student_number", trimmed)
    .maybeSingle();

  if (!data) return null;
  const row = data as { optional_user_id: string | null; users: { email: string | null } | { email: string | null }[] | null };
  if (!row.optional_user_id) return null;

  return pickEmail(row);
}

async function resolveTeacherLoginEmail(loginId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("teacher_profiles")
    .select("users(email)")
    .ilike("login_id", loginId)
    .maybeSingle();

  return pickEmail(data as { users: { email: string | null } | { email: string | null }[] | null } | null);
}

async function resolveParentLoginEmail(loginId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("parent_profiles")
    .select("users(email)")
    .ilike("login_id", loginId)
    .maybeSingle();

  return pickEmail(data as { users: { email: string | null } | { email: string | null }[] | null } | null);
}

// Single entry point for the login page's ID tab — covers Student ID
// (ZIVA-...), Teacher login ID (TCH-...), and Parent login ID (PAR-...).
// Dispatches by prefix when recognized; falls back to trying all three so a
// mistyped or unfamiliar prefix still resolves if it happens to match.
export async function resolveLoginEmailById(id: string): Promise<string | null> {
  const trimmed = id.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (upper.startsWith("ZIVA-")) return resolveStudentLoginEmail(trimmed);
  if (upper.startsWith("TCH-")) return resolveTeacherLoginEmail(trimmed);
  if (upper.startsWith("PAR-")) return resolveParentLoginEmail(trimmed);

  const [student, teacher, parent] = await Promise.all([
    resolveStudentLoginEmail(trimmed),
    resolveTeacherLoginEmail(trimmed),
    resolveParentLoginEmail(trimmed),
  ]);
  return student ?? teacher ?? parent;
}
