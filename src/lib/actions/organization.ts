"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export interface OrganizationSettings {
  parent_can_edit_location: boolean;
  parent_can_edit_photo: boolean;
  ranking_enabled_default: boolean;
  currency_symbol: string;
  // ISO datetime string, or null when no deadline is set. Set by the admin
  // in Settings and shown to teachers on the Lesson Notes page.
  lesson_note_deadline: string | null;
}

export interface Organization {
  id: string;
  name: string;
  motto: string | null;
  established_year: number | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  social_media: Record<string, string>;
  settings: OrganizationSettings;
}

const DEFAULT_SETTINGS: OrganizationSettings = {
  parent_can_edit_location: false,
  parent_can_edit_photo: false,
  ranking_enabled_default: false,
  currency_symbol: "GHS",
  lesson_note_deadline: null,
};

// Any authenticated org member (admin, teacher, parent, student) can read
// their own org's public branding — used on official documents like
// terminal report PDFs. organization_select RLS already scopes this to the
// caller's own organization_id.
export async function getOrgBranding(): Promise<{ name: string; motto: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("organizations").select("name, motto").limit(1).maybeSingle();
  if (!data) return null;
  const row = data as { name: string; motto: string | null };
  return { name: row.name, motto: row.motto ?? "Excellence Our Hallmark" };
}

// Read-only settings for any authenticated org member — used to decide
// whether to show the "request a change" UI at all.
export async function getMyOrgSettings(): Promise<OrganizationSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DEFAULT_SETTINGS;

  const { data } = await supabase.from("organizations").select("settings").limit(1).maybeSingle();
  const settings = (data as { settings: Partial<OrganizationSettings> | null } | null)?.settings ?? {};
  return { ...DEFAULT_SETTINGS, ...settings };
}

export async function getOrganization(): Promise<Organization | null> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("organizations")
    .select("id, name, motto, established_year, logo_url, phone, email, social_media, settings")
    .eq("id", organizationId)
    .single();

  if (!data) return null;

  const row = data as {
    id: string;
    name: string;
    motto: string | null;
    established_year: number | null;
    logo_url: string | null;
    phone: string | null;
    email: string | null;
    social_media: Record<string, string> | null;
    settings: Partial<OrganizationSettings> | null;
  };

  return {
    ...row,
    social_media: row.social_media ?? {},
    settings: { ...DEFAULT_SETTINGS, ...(row.settings ?? {}) },
  };
}

export async function updateOrganizationProfile(input: {
  name: string;
  motto: string;
  established_year: number | null;
  phone: string;
  email: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  whatsapp: string;
}): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const social_media: Record<string, string> = {};
    if (input.facebook) social_media.facebook = input.facebook;
    if (input.instagram) social_media.instagram = input.instagram;
    if (input.tiktok) social_media.tiktok = input.tiktok;
    if (input.whatsapp) social_media.whatsapp = input.whatsapp;

    const { error } = await supabase
      .from("organizations")
      .update({
        name: input.name,
        motto: input.motto || null,
        established_year: input.established_year,
        phone: input.phone || null,
        email: input.email || null,
        social_media,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateOrganizationSettings(
  settings: OrganizationSettings
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("organizations")
      .update({ settings, updated_at: new Date().toISOString() })
      .eq("id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
