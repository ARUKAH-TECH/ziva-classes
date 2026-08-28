import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/permissions/roles";

export interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string | null;
  orgName: string;
}

// Server-side helper for layouts/pages: resolves the signed-in user's
// profile + organization for display purposes. Access control itself is
// enforced by middleware.ts (routing) and Postgres RLS (data) — this is
// convenience data-fetching, not a security check.
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("users")
    .select("first_name, last_name, role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profileData) {
    redirect("/login");
  }

  const profile = profileData as {
    first_name: string;
    last_name: string;
    role: UserRole;
    organization_id: string | null;
  };

  let orgName = "ZIVA Online & Special Classes";
  if (profile.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", profile.organization_id)
      .single();
    const orgRow = org as { name: string } | null;
    if (orgRow?.name) orgName = orgRow.name;
  }

  return {
    id: user.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: profile.role,
    organizationId: profile.organization_id,
    orgName,
  };
}
