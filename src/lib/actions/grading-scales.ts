"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";

export interface GradingScale {
  id: string;
  academic_level_id: string;
  academic_level_name: string;
  name: string;
  is_active: boolean;
  band_count: number;
}

export interface GradeBand {
  id: string;
  min_score: number;
  max_score: number;
  grade_label: string;
  grade_point: number | null;
  remark: string | null;
  display_order: number;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

export async function listGradingScales(): Promise<GradingScale[]> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("grading_scales")
    .select("id, academic_level_id, name, is_active, academic_levels(name), grade_bands(id)")
    .eq("organization_id", organizationId);

  type Nested = { name: string } | { name: string }[] | null;
  type Raw = {
    id: string;
    academic_level_id: string;
    name: string;
    is_active: boolean;
    academic_levels: Nested;
    grade_bands: { id: string }[] | null;
  };

  return ((data as Raw[]) ?? []).map((row) => ({
    id: row.id,
    academic_level_id: row.academic_level_id,
    academic_level_name: one(row.academic_levels)?.name ?? "—",
    name: row.name,
    is_active: row.is_active,
    band_count: row.grade_bands?.length ?? 0,
  }));
}

export async function createGradingScale(input: {
  academic_level_id: string;
  name: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    if (!input.academic_level_id || !input.name) {
      return { success: false, error: "Academic level and name are required." };
    }

    const { data, error } = await supabase
      .from("grading_scales")
      .insert({ organization_id: organizationId, academic_level_id: input.academic_level_id, name: input.name })
      .select("id")
      .single();

    if (error || !data) return { success: false, error: error?.message ?? "Could not create scale." };

    revalidatePath("/admin/settings");
    return { success: true, data: { id: (data as { id: string }).id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteGradingScale(id: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("grading_scales")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) {
      return {
        success: false,
        error: error.code === "23503" ? "Remove this scale's grade bands first." : error.message,
      };
    }

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function listGradeBands(scaleId: string): Promise<GradeBand[]> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("grade_bands")
    .select("id, min_score, max_score, grade_label, grade_point, remark, display_order")
    .eq("grading_scale_id", scaleId)
    .order("display_order", { ascending: true });

  return (data as GradeBand[]) ?? [];
}

export async function createGradeBand(input: {
  grading_scale_id: string;
  min_score: number;
  max_score: number;
  grade_label: string;
  grade_point: number | null;
  remark: string;
  display_order: number;
}): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    if (input.max_score < input.min_score) {
      return { success: false, error: "Max score must be greater than or equal to min score." };
    }

    const { error } = await supabase.from("grade_bands").insert({
      grading_scale_id: input.grading_scale_id,
      min_score: input.min_score,
      max_score: input.max_score,
      grade_label: input.grade_label,
      grade_point: input.grade_point,
      remark: input.remark || null,
      display_order: input.display_order,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteGradeBand(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("grade_bands").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
