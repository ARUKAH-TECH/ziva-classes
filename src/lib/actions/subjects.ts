"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  active: boolean;
}

export async function listSubjects(): Promise<Subject[]> {
  const { supabase, organizationId } = await requireAdmin();
  const { data } = await supabase
    .from("subjects")
    .select("id, name, code, description, active")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });
  return (data as Subject[]) ?? [];
}

export async function createSubject(input: {
  name: string;
  code: string;
  description: string;
}): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    if (!input.name) return { success: false, error: "Subject name is required." };

    const { error } = await supabase.from("subjects").insert({
      organization_id: organizationId,
      name: input.name,
      code: input.code || null,
      description: input.description || null,
    });

    if (error) {
      return {
        success: false,
        error: error.code === "23505" ? "A subject with this name already exists." : error.message,
      };
    }

    revalidatePath("/admin/subjects");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateSubject(
  id: string,
  input: { name: string; code: string; description: string }
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("subjects")
      .update({ name: input.name, code: input.code || null, description: input.description || null })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/subjects");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function setSubjectActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("subjects")
      .update({ active })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/subjects");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
