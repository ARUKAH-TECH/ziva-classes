import "server-only";
import { createClient } from "@/lib/supabase/server";
import { NotAuthorizedError } from "@/lib/auth/require-admin";

// Server Action guard for student-side actions (viewing their own subjects,
// timetable, attendance, results, assignments, profile). Same
// fail-fast-with-a-clear-message purpose as requireTeacher/requireParent —
// Postgres RLS (student_* policies in rls_policies.sql + 006/010) is still
// the real enforcement boundary underneath every query.
export async function requireStudent() {
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

  if (!profile || profile.role !== "STUDENT") {
    throw new NotAuthorizedError("Only students can perform this action.");
  }

  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("optional_user_id", user.id)
    .single();

  const studentId = (studentProfile as { id: string } | null)?.id;
  if (!studentId) throw new NotAuthorizedError("No student profile found for this account.");

  return { supabase, userId: user.id, organizationId: profile.organization_id, studentId };
}
