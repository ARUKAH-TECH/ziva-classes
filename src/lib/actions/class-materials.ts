"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export interface ClassMaterialRow {
  id: string;
  class_id: string;
  name: string;
  description: string | null;
}

// Read-only, shared by admin/teacher/parent/student — RLS scopes
// visibility to the caller's organization; this just needs a signed-in
// session (parents/students view their child's/own class's list).
export async function listClassMaterials(classId: string): Promise<ClassMaterialRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("class_materials")
    .select("id, class_id, name, description")
    .eq("class_id", classId)
    .order("name", { ascending: true });

  return (data as ClassMaterialRow[]) ?? [];
}

export async function addClassMaterial(
  classId: string,
  name: string,
  description: string
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    if (!name) return { success: false, error: "Name is required." };

    const { error } = await supabase.from("class_materials").insert({
      organization_id: organizationId,
      class_id: classId,
      name,
      description: description || null,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/admin/classes/${classId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function removeClassMaterial(id: string, classId: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("class_materials")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/admin/classes/${classId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
