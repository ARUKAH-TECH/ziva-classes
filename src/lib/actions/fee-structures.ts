"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";

export interface FeeStructureRow {
  id: string;
  fee_type: "SUBJECT" | "MATERIALS";
  class_subject_id: string | null;
  class_id: string | null;
  class_name: string;
  subject_name: string;
  academic_year_id: string;
  academic_year_name: string;
  term_id: string | null;
  term_name: string | null;
  amount: number;
  description: string | null;
  active: boolean;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

export async function listFeeStructures(): Promise<FeeStructureRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  // Filtered on fee_structures.organization_id directly (not through the
  // class_subjects/classes join) because a MATERIALS row has no
  // class_subject_id — an inner-join filter on that relation would silently
  // drop every materials fee.
  const { data } = await supabase
    .from("fee_structures")
    .select(
      "id, fee_type, class_subject_id, class_id, academic_year_id, term_id, amount, description, active, class_subjects(classes(name), subjects(name)), classes(name), academic_years(name), terms(name)"
    )
    .eq("organization_id", organizationId)
    .order("active", { ascending: false });

  type Nested = { name: string } | { name: string }[] | null;
  type Raw = {
    id: string;
    fee_type: "SUBJECT" | "MATERIALS";
    class_subject_id: string | null;
    class_id: string | null;
    academic_year_id: string;
    term_id: string | null;
    amount: number;
    description: string | null;
    active: boolean;
    class_subjects: { classes: Nested; subjects: Nested } | { classes: Nested; subjects: Nested }[] | null;
    classes: Nested;
    academic_years: Nested;
    terms: Nested;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const cs = one(row.class_subjects);
    const isMaterials = row.fee_type === "MATERIALS";
    return {
      id: row.id,
      fee_type: row.fee_type,
      class_subject_id: row.class_subject_id,
      class_id: row.class_id,
      class_name: isMaterials ? one(row.classes)?.name ?? "—" : one(cs?.classes ?? null)?.name ?? "—",
      subject_name: isMaterials ? "Materials" : one(cs?.subjects ?? null)?.name ?? "—",
      academic_year_id: row.academic_year_id,
      academic_year_name: one(row.academic_years)?.name ?? "—",
      term_id: row.term_id,
      term_name: one(row.terms)?.name ?? null,
      amount: row.amount,
      description: row.description,
      active: row.active,
    };
  });
}

export async function createFeeStructure(input: {
  class_subject_id: string;
  academic_year_id: string;
  term_id: string;
  amount: number;
  description: string;
}): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    if (!input.class_subject_id || !input.academic_year_id || input.amount <= 0) {
      return { success: false, error: "Class/subject, academic year, and a positive amount are required." };
    }

    const { error } = await supabase.from("fee_structures").insert({
      organization_id: organizationId,
      fee_type: "SUBJECT",
      class_subject_id: input.class_subject_id,
      academic_year_id: input.academic_year_id,
      term_id: input.term_id || null,
      amount: input.amount,
      description: input.description || null,
      active: true,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/fees");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// A materials fee applies to every student enrolled in the class as a
// whole (see generateChargesForTerm), not one subject — e.g. a JHS 1
// "Textbook fee" for GH₵50, billed once per JHS 1 student regardless of
// which subjects they're taking.
export async function createMaterialsFeeStructure(input: {
  class_id: string;
  academic_year_id: string;
  term_id: string;
  amount: number;
  description: string;
}): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    if (!input.class_id || !input.academic_year_id || input.amount <= 0) {
      return { success: false, error: "Class, academic year, and a positive amount are required." };
    }

    const { error } = await supabase.from("fee_structures").insert({
      organization_id: organizationId,
      fee_type: "MATERIALS",
      class_id: input.class_id,
      academic_year_id: input.academic_year_id,
      term_id: input.term_id || null,
      amount: input.amount,
      description: input.description || null,
      active: true,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/fees");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function setFeeStructureActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("fee_structures")
      .update({ active })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/fees");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
