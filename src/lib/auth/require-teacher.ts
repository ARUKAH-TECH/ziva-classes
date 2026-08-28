import "server-only";
import { createClient } from "@/lib/supabase/server";
import { NotAuthorizedError } from "@/lib/auth/require-admin";

// Server Action guard for teacher-side actions (marking attendance, viewing
// their own schedule/sessions). Same fail-fast-with-a-clear-message purpose
// as requireAdmin — Postgres RLS (teacher_* policies in rls_policies.sql)
// is still the real enforcement boundary underneath every query.
export async function requireTeacher() {
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

  if (!profile || profile.role !== "TEACHER") {
    throw new NotAuthorizedError("Only teachers can perform this action.");
  }

  const { data: teacherProfile } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const teacherId = (teacherProfile as { id: string } | null)?.id;
  if (!teacherId) throw new NotAuthorizedError("No teacher profile found for this account.");

  return { supabase, userId: user.id, organizationId: profile.organization_id, teacherId };
}
