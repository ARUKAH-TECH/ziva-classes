"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { notifyParentsOfStudent } from "@/lib/notifications";

export interface StudentChargeRow {
  id: string;
  fee_structure_id: string;
  subject_name: string;
  term_name: string | null;
  amount_due: number;
  amount_paid: number;
  balance: number;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

async function withAllocations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  charges: { id: string; fee_structure_id: string; amount_due: number; subject_name: string; term_name: string | null }[]
): Promise<StudentChargeRow[]> {
  if (charges.length === 0) return [];

  const { data: allocations } = await supabase
    .from("payment_allocations")
    .select("student_charge_id, amount_allocated")
    .in(
      "student_charge_id",
      charges.map((c) => c.id)
    );

  const paidByCharge = new Map<string, number>();
  ((allocations as { student_charge_id: string; amount_allocated: number }[]) ?? []).forEach((a) => {
    paidByCharge.set(a.student_charge_id, (paidByCharge.get(a.student_charge_id) ?? 0) + a.amount_allocated);
  });

  return charges.map((c) => {
    const paid = paidByCharge.get(c.id) ?? 0;
    return { ...c, amount_paid: Math.round(paid * 100) / 100, balance: Math.round((c.amount_due - paid) * 100) / 100 };
  });
}

export async function listStudentCharges(studentId: string): Promise<StudentChargeRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("student_charges")
    .select("id, fee_structure_id, amount_due, fee_structures(description, terms(name), class_subjects(subjects(name)))")
    .eq("student_id", studentId);

  type Nested = { name: string } | { name: string }[] | null;
  type FS = {
    description: string | null;
    terms: Nested;
    class_subjects: { subjects: Nested } | { subjects: Nested }[] | null;
  };
  type Raw = { id: string; fee_structure_id: string; amount_due: number; fee_structures: FS | FS[] | null };

  const base = ((data as Raw[]) ?? []).map((row) => {
    const fs = one(row.fee_structures);
    const subjectName = one(one(fs?.class_subjects ?? null)?.subjects ?? null)?.name ?? fs?.description ?? "—";
    return {
      id: row.id,
      fee_structure_id: row.fee_structure_id,
      amount_due: row.amount_due,
      subject_name: subjectName,
      term_name: one(fs?.terms ?? null)?.name ?? null,
    };
  });

  return withAllocations(supabase, base);
}

// Materializes student_charges from active fee_structures for every
// student actually enrolled in that class_subject (student_subjects) for
// the given term — skips students who already have that charge. Mirrors
// the "generate sessions from schedule" pattern from Phase 4.
export async function generateChargesForTerm(termId: string): Promise<ActionResult<{ created: number }>> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { data: feeStructures } = await supabase
      .from("fee_structures")
      .select("id, class_subject_id, amount, class_subjects!inner(classes!inner(organization_id))")
      .eq("term_id", termId)
      .eq("active", true)
      .eq("class_subjects.classes.organization_id", organizationId);

    if (!feeStructures || feeStructures.length === 0) {
      return { success: true, data: { created: 0 } };
    }

    let created = 0;
    for (const fs of feeStructures as { id: string; class_subject_id: string; amount: number }[]) {
      const { data: enrolled } = await supabase
        .from("student_subjects")
        .select("student_id")
        .eq("class_subject_id", fs.class_subject_id);

      const studentIds = ((enrolled as { student_id: string }[]) ?? []).map((e) => e.student_id);
      if (studentIds.length === 0) continue;

      const { data: existingCharges } = await supabase
        .from("student_charges")
        .select("student_id")
        .eq("fee_structure_id", fs.id)
        .in("student_id", studentIds);

      const existingIds = new Set(((existingCharges as { student_id: string }[]) ?? []).map((c) => c.student_id));
      const toCreate = studentIds.filter((id) => !existingIds.has(id));
      if (toCreate.length === 0) continue;

      const { error } = await supabase.from("student_charges").insert(
        toCreate.map((student_id) => ({ student_id, fee_structure_id: fs.id, amount_due: fs.amount }))
      );
      if (error) return { success: false, error: error.message };
      created += toCreate.length;
    }

    revalidatePath("/admin/fees");
    return { success: true, data: { created } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export interface OutstandingRow {
  student_id: string;
  student_name: string;
  total_due: number;
  total_paid: number;
  balance: number;
}

export async function listOutstandingBalances(): Promise<OutstandingRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  const { data: charges } = await supabase
    .from("student_charges")
    .select("id, student_id, amount_due, student_profiles!inner(first_name, last_name, organization_id)")
    .eq("student_profiles.organization_id", organizationId);

  type Raw = {
    id: string;
    student_id: string;
    amount_due: number;
    student_profiles: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  };
  const rows = (charges as Raw[]) ?? [];
  if (rows.length === 0) return [];

  const { data: allocations } = await supabase
    .from("payment_allocations")
    .select("student_charge_id, amount_allocated")
    .in(
      "student_charge_id",
      rows.map((r) => r.id)
    );

  const paidByCharge = new Map<string, number>();
  ((allocations as { student_charge_id: string; amount_allocated: number }[]) ?? []).forEach((a) => {
    paidByCharge.set(a.student_charge_id, (paidByCharge.get(a.student_charge_id) ?? 0) + a.amount_allocated);
  });

  const byStudent = new Map<string, OutstandingRow>();
  rows.forEach((r) => {
    const u = one(r.student_profiles);
    const paid = paidByCharge.get(r.id) ?? 0;
    const existing = byStudent.get(r.student_id) ?? {
      student_id: r.student_id,
      student_name: u ? `${u.first_name} ${u.last_name}` : "—",
      total_due: 0,
      total_paid: 0,
      balance: 0,
    };
    existing.total_due += r.amount_due;
    existing.total_paid += paid;
    existing.balance = Math.round((existing.total_due - existing.total_paid) * 100) / 100;
    byStudent.set(r.student_id, existing);
  });

  return Array.from(byStudent.values())
    .filter((r) => r.balance > 0)
    .sort((a, b) => b.balance - a.balance);
}

export async function sendFeeReminder(studentId: string, balance: number): Promise<ActionResult> {
  try {
    await requireAdmin();

    await notifyParentsOfStudent(
      studentId,
      "Outstanding balance reminder",
      `Your outstanding balance is GH₵${balance}. Please arrange payment at your earliest convenience.`,
      "FEE_REMINDER"
    );

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
