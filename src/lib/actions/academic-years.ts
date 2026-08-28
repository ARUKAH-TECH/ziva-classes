"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireOrgMember, type ActionResult } from "@/lib/auth/require-admin";

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export async function listAcademicYears(): Promise<AcademicYear[]> {
  const { supabase, organizationId } = await requireOrgMember();
  const { data } = await supabase
    .from("academic_years")
    .select("id, name, start_date, end_date, is_current")
    .eq("organization_id", organizationId)
    .order("start_date", { ascending: false });
  return (data as AcademicYear[]) ?? [];
}

export async function createAcademicYear(input: {
  name: string;
  start_date: string;
  end_date: string;
}): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    if (!input.name || !input.start_date || !input.end_date) {
      return { success: false, error: "Name, start date, and end date are required." };
    }
    if (input.end_date <= input.start_date) {
      return { success: false, error: "End date must be after the start date." };
    }

    const { error } = await supabase.from("academic_years").insert({
      organization_id: organizationId,
      name: input.name,
      start_date: input.start_date,
      end_date: input.end_date,
    });

    if (error) {
      return {
        success: false,
        error: error.code === "23505" ? "An academic year with this name already exists." : error.message,
      };
    }

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function setCurrentAcademicYear(id: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    await supabase
      .from("academic_years")
      .update({ is_current: false })
      .eq("organization_id", organizationId);

    const { error } = await supabase
      .from("academic_years")
      .update({ is_current: true })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteAcademicYear(id: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("academic_years")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) {
      return {
        success: false,
        error:
          error.code === "23503"
            ? "This academic year has terms, enrollments, or reports linked to it and cannot be deleted."
            : error.message,
      };
    }

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
