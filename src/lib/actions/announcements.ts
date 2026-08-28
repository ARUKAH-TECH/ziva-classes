"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export interface AnnouncementRow {
  id: string;
  title: string;
  message: string;
  created_by_name: string | null;
  published_at: string | null;
  created_at: string;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

// Every signed-in org member can see published announcements — RLS
// (announcements_org_view) scopes this to the caller's own organization.
export async function listAnnouncements(limit = 20): Promise<AnnouncementRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("announcements")
    .select("id, title, message, published_at, created_at, users(first_name, last_name)")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type Raw = {
    id: string;
    title: string;
    message: string;
    published_at: string | null;
    created_at: string;
    users: U;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const u = one(row.users);
    return {
      id: row.id,
      title: row.title,
      message: row.message,
      created_by_name: u ? `${u.first_name} ${u.last_name}` : null,
      published_at: row.published_at,
      created_at: row.created_at,
    };
  });
}

export async function createAnnouncement(input: { title: string; message: string }): Promise<ActionResult> {
  try {
    const { supabase, organizationId, userId } = await requireAdmin();

    if (!input.title || !input.message) {
      return { success: false, error: "Title and message are required." };
    }

    const { error } = await supabase.from("announcements").insert({
      organization_id: organizationId,
      title: input.title,
      message: input.message,
      created_by: userId,
      published_at: new Date().toISOString(),
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/communication");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/communication");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
