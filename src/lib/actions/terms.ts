"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireOrgMember, type ActionResult } from "@/lib/auth/require-admin";

export interface Term {
  id: string;
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export async function listTerms(academicYearId: string): Promise<Term[]> {
  const { supabase } = await requireOrgMember();
  const { data } = await supabase
    .from("terms")
    .select("id, academic_year_id, name, start_date, end_date, is_current")
    .eq("academic_year_id", academicYearId)
    .order("start_date", { ascending: true });
  return (data as Term[]) ?? [];
}

export async function createTerm(input: {
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
}): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    if (!input.name || !input.start_date || !input.end_date) {
      return { success: false, error: "Name, start date, and end date are required." };
    }
    if (input.end_date <= input.start_date) {
      return { success: false, error: "End date must be after the start date." };
    }

    const { error } = await supabase.from("terms").insert({
      academic_year_id: input.academic_year_id,
      name: input.name,
      start_date: input.start_date,
      end_date: input.end_date,
    });

    if (error) {
      return {
        success: false,
        error: error.code === "23505" ? "A term with this name already exists for this year." : error.message,
      };
    }

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function setCurrentTerm(id: string, academicYearId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    await supabase.from("terms").update({ is_current: false }).eq("academic_year_id", academicYearId);

    const { error } = await supabase.from("terms").update({ is_current: true }).eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteTerm(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("terms").delete().eq("id", id);

    if (error) {
      return {
        success: false,
        error:
          error.code === "23503"
            ? "This term has assessments or reports linked to it and cannot be deleted."
            : error.message,
      };
    }

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
