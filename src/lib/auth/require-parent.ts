import "server-only";
import { createClient } from "@/lib/supabase/server";
import { NotAuthorizedError } from "@/lib/auth/require-admin";

// Server Action guard for parent-side actions (viewing their own children's
// timetable/profile). Same fail-fast-with-a-clear-message purpose as
// requireTeacher — Postgres RLS (parent_* policies in rls_policies.sql) is
// still the real enforcement boundary underneath every query.
export async function requireParent() {
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

  if (!profile || profile.role !== "PARENT") {
    throw new NotAuthorizedError("Only parents can perform this action.");
  }

  const { data: parentProfile } = await supabase
    .from("parent_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const parentId = (parentProfile as { id: string } | null)?.id;
  if (!parentId) throw new NotAuthorizedError("No parent profile found for this account.");

  return { supabase, userId: user.id, organizationId: profile.organization_id, parentId };
}
