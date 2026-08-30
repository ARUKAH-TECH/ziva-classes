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

export interface PasswordlessCredentials {
  email: string;
  password: string;
}

function pickCredentials(
  row: { users: { email: string | null; current_password: string | null } | { email: string | null; current_password: string | null }[] | null } | null
): PasswordlessCredentials | null {
  if (!row) return null;
  const u = Array.isArray(row.users) ? row.users[0] : row.users;
  if (!u?.email || !u?.current_password) return null;
  return { email: u.email, password: u.current_password };
}

async function resolveStudentPasswordlessLogin(studentNumber: string): Promise<PasswordlessCredentials | null> {
  const trimmed = studentNumber.trim();
  if (!trimmed) return null;

  const admin = createAdminClient();

  const { data } = await admin
    .from("student_profiles")
    .select("optional_user_id, users(email, current_password)")
    .ilike("student_number", trimmed)
    .maybeSingle();

  if (!data) return null;
  const row = data as {
    optional_user_id: string | null;
    users: { email: string | null; current_password: string | null } | { email: string | null; current_password: string | null }[] | null;
  };
  if (!row.optional_user_id) return null;

  return pickCredentials(row);
}

async function resolveParentPasswordlessLogin(loginId: string): Promise<PasswordlessCredentials | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("parent_profiles")
    .select("users(email, current_password)")
    .ilike("login_id", loginId)
    .maybeSingle();

  return pickCredentials(
    data as { users: { email: string | null; current_password: string | null } | { email: string | null; current_password: string | null }[] | null } | null
  );
}

// Students and parents sign in with just their ID — no password prompt.
// Their Supabase Auth password is a system-managed value (a student's is
// their linked parent's phone number; see students.ts) mirrored in plain
// text into users.current_password purely so it can be looked up here and
// used to complete the sign-in behind the scenes. Teachers are unaffected —
// this only resolves for the ZIVA-/PAR- prefixes; TCH- and anything else
// still goes through the password-protected email/ID form.
export async function resolvePasswordlessLoginById(id: string): Promise<PasswordlessCredentials | null> {
  const trimmed = id.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (upper.startsWith("ZIVA-")) return resolveStudentPasswordlessLogin(trimmed);
  if (upper.startsWith("PAR-")) return resolveParentPasswordlessLogin(trimmed);
  return null;
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
