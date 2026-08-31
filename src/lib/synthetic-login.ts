import type { SupabaseClient } from "@supabase/supabase-js";

// Shared by students.ts, teachers.ts, and parents.ts. When someone is
// created without a real email, we still need an email-shaped identifier
// for Supabase Auth — this derives one from their generated ID (Student ID,
// or a TCH-/PAR- login ID) that nobody ever sees or types. The login page
// resolves a typed ID back to this address server-side (see
// src/lib/actions/auth-lookup.ts) and signs in with it behind the scenes.
export function synthEmailForLoginId(loginId: string) {
  return `${loginId.toLowerCase()}@ziva-classes.internal`;
}

function generateSequentialId(prefix: string, sequence: number) {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

export function generateTeacherLoginId(sequence: number) {
  return generateSequentialId("TCH", sequence);
}

export function generateParentLoginId(sequence: number) {
  return generateSequentialId("PAR", sequence);
}

// The next ID must be based on the highest number ever issued, not a row
// count — a COUNT-based sequence collides with an existing ID as soon as
// anything is deleted (count shrinks below the highest number already
// used), which is exactly what happened with student IDs after a test
// student was deleted. This scans every non-null value in the column
// (school-sized tables, so this is cheap) and takes the max numeric suffix.
export async function nextIdSequence(
  admin: SupabaseClient,
  table: string,
  column: string,
  organizationId: string
): Promise<number> {
  const { data } = await admin
    .from(table)
    .select(column)
    .eq("organization_id", organizationId)
    .not(column, "is", null);

  let max = 0;
  for (const row of (data as unknown as Record<string, string>[]) ?? []) {
    const match = row[column]?.match(/(\d+)$/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return max + 1;
}

// Same idea as nextIdSequence, but scoped to a specific prefix (e.g.
// "ZIVA/PRI/26/") rather than the whole org/table — needed once IDs are
// structured per level/year, where a global max-suffix scan would collide
// across different level/year buckets that happen to share a numeric tail.
export async function nextIdSequenceForPrefix(
  admin: SupabaseClient,
  table: string,
  column: string,
  organizationId: string,
  prefix: string
): Promise<number> {
  const { data } = await admin
    .from(table)
    .select(column)
    .eq("organization_id", organizationId)
    .ilike(column, `${prefix}%`);

  let max = 0;
  for (const row of (data as unknown as Record<string, string>[]) ?? []) {
    const value = row[column];
    if (!value) continue;
    const suffix = value.slice(prefix.length);
    const n = parseInt(suffix, 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return max + 1;
}

// Uppercases and strips everything but letters/digits — used to turn a
// free-typed level name or teacher specialization into an ID-safe code
// segment (e.g. "Junior High" -> "JUNIORHIGH") when no explicit short code
// has been set.
export function sanitizeIdSegment(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
