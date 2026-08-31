"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";

export interface AcademicLevel {
  id: string;
  name: string;
  level_order: number | null;
  code: string | null;
}

export async function listAcademicLevels(): Promise<AcademicLevel[]> {
  const { supabase, organizationId } = await requireAdmin();
  const { data } = await supabase
    .from("academic_levels")
    .select("id, name, level_order, code")
    .eq("organization_id", organizationId)
    .order("level_order", { ascending: true });
  return (data as AcademicLevel[]) ?? [];
}

export async function createAcademicLevel(input: {
  name: string;
  level_order: number;
  code: string;
}): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    if (!input.name) return { success: false, error: "Name is required." };

    const { error } = await supabase.from("academic_levels").insert({
      organization_id: organizationId,
      name: input.name,
      level_order: input.level_order,
      code: input.code.trim().toUpperCase() || null,
    });

    if (error) {
      return {
        success: false,
        error: error.code === "23505" ? "A level with this name already exists." : error.message,
      };
    }

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// The code drives the level segment of a student's structured ID
// (ZIVA/{code}/{yy}/{seq}) — editable separately from creation since every
// level already existed in production before this field did.
export async function updateAcademicLevel(id: string, input: { code: string }): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("academic_levels")
      .update({ code: input.code.trim().toUpperCase() || null })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteAcademicLevel(id: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("academic_levels")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) {
      return {
        success: false,
        error:
          error.code === "23503"
            ? "This level has classes or grading scales linked to it and cannot be deleted."
            : error.message,
      };
    }

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// Seeds the standard ZIVA levels (Primary 1-6, JHS 1-3, SHS 1-3) per
// requirement §15 — offered as a one-click action on first setup rather
// than forcing the admin to type all 12 in one by one.
export async function seedStandardLevels(): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const levels = [
      "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
      "JHS 1", "JHS 2", "JHS 3",
      "SHS 1", "SHS 2", "SHS 3",
    ].map((name, i) => ({ organization_id: organizationId, name, level_order: i + 1 }));

    const { error } = await supabase.from("academic_levels").insert(levels);

    if (error) {
      return {
        success: false,
        error: error.code === "23505" ? "Standard levels already exist." : error.message,
      };
    }

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
