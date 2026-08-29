"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { notifyParentsOfStudent } from "@/lib/notifications";

export interface StudentChargeRow {
  id: string;
  fee_structure_id: string | null;
  subject_name: string;
  term_name: string | null;
  amount_due: number;
  amount_paid: number;
  balance: number;
  is_adhoc: boolean;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

async function withAllocations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  charges: {
    id: string;
    fee_structure_id: string | null;
    amount_due: number;
    subject_name: string;
    term_name: string | null;
    is_adhoc: boolean;
  }[]
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
    .select(
      "id, fee_structure_id, amount_due, description, fee_structures(fee_type, description, terms(name), class_subjects(subjects(name)))"
    )
    .eq("student_id", studentId);

  type Nested = { name: string } | { name: string }[] | null;
  type FS = {
    fee_type: "SUBJECT" | "MATERIALS";
    description: string | null;
    terms: Nested;
    class_subjects: { subjects: Nested } | { subjects: Nested }[] | null;
  };
  type Raw = {
    id: string;
    fee_structure_id: string | null;
    amount_due: number;
    description: string | null;
    fee_structures: FS | FS[] | null;
  };

  const base = ((data as Raw[]) ?? []).map((row) => {
    const fs = one(row.fee_structures);
    // row.description is a per-charge override — set for ad-hoc charges,
    // and settable via "Edit" on any charge, so it always wins when present.
    let subjectName = row.description ?? "";
    if (!subjectName) {
      if (!fs) subjectName = "Other";
      else if (fs.fee_type === "MATERIALS") subjectName = fs.description ?? "Materials";
      else subjectName = one(one(fs.class_subjects ?? null)?.subjects ?? null)?.name ?? fs.description ?? "—";
    }
    return {
      id: row.id,
      fee_structure_id: row.fee_structure_id,
      amount_due: row.amount_due,
      subject_name: subjectName,
      term_name: one(fs?.terms ?? null)?.name ?? null,
      is_adhoc: !row.fee_structure_id,
    };
  });

  return withAllocations(supabase, base);
}

export interface ApplicableFeeStructureRow {
  id: string;
  label: string;
  amount: number;
  term_name: string | null;
}

// The active fee structures (subject fees for subjects this student is
// actually taking, plus materials fees for their class) that this student
// doesn't already have a charge for — lets an admin bill one student for an
// existing class/subject fee without running "Generate charges" for the
// whole cohort.
export async function listApplicableFeeStructuresForStudent(
  studentId: string
): Promise<ApplicableFeeStructureRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  const { data: enrollment } = await supabase
    .from("student_enrollments")
    .select("class_id, academic_year_id")
    .eq("student_id", studentId)
    .eq("status", "ACTIVE");

  type EnrollRow = { class_id: string; academic_year_id: string };
  const enrollments = (enrollment as EnrollRow[]) ?? [];
  if (enrollments.length === 0) return [];

  const { data: studentSubjects } = await supabase
    .from("student_subjects")
    .select("class_subject_id")
    .eq("student_id", studentId);
  const classSubjectIds = ((studentSubjects as { class_subject_id: string }[]) ?? []).map(
    (s) => s.class_subject_id
  );

  const { data: existingCharges } = await supabase
    .from("student_charges")
    .select("fee_structure_id")
    .eq("student_id", studentId)
    .not("fee_structure_id", "is", null);
  const alreadyCharged = new Set(
    ((existingCharges as { fee_structure_id: string }[]) ?? []).map((c) => c.fee_structure_id)
  );

  const classIds = enrollments.map((e) => e.class_id);
  const yearIds = Array.from(new Set(enrollments.map((e) => e.academic_year_id)));

  const orFilters: string[] = [];
  if (classSubjectIds.length > 0) {
    orFilters.push(`and(fee_type.eq.SUBJECT,class_subject_id.in.(${classSubjectIds.join(",")}))`);
  }
  if (classIds.length > 0) {
    orFilters.push(`and(fee_type.eq.MATERIALS,class_id.in.(${classIds.join(",")}))`);
  }
  if (orFilters.length === 0) return [];

  const { data } = await supabase
    .from("fee_structures")
    .select(
      "id, fee_type, amount, description, class_subjects(subjects(name), classes(name)), classes(name), terms(name)"
    )
    .eq("organization_id", organizationId)
    .eq("active", true)
    .in("academic_year_id", yearIds)
    .or(orFilters.join(","));

  type Nested = { name: string } | { name: string }[] | null;
  type Raw = {
    id: string;
    fee_type: "SUBJECT" | "MATERIALS";
    amount: number;
    description: string | null;
    class_subjects: { subjects: Nested; classes: Nested } | { subjects: Nested; classes: Nested }[] | null;
    classes: Nested;
    terms: Nested;
  };

  return ((data as Raw[]) ?? [])
    .filter((row) => !alreadyCharged.has(row.id))
    .map((row) => {
      const cs = one(row.class_subjects);
      const label =
        row.fee_type === "MATERIALS"
          ? `${row.description ?? "Materials"} — ${one(row.classes)?.name ?? "—"}`
          : `${one(cs?.subjects ?? null)?.name ?? "—"} — ${one(cs?.classes ?? null)?.name ?? "—"}`;
      return {
        id: row.id,
        label,
        amount: row.amount,
        term_name: one(row.terms)?.name ?? null,
      };
    });
}

// Bills this one student for an existing fee structure (as opposed to
// "Generate charges for term" on the Fees page, which bills everyone
// eligible at once).
export async function applyFeeStructureToStudent(
  studentId: string,
  feeStructureId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { data: fs } = await supabase
      .from("fee_structures")
      .select("amount")
      .eq("id", feeStructureId)
      .single();
    if (!fs) return { success: false, error: "Fee structure not found." };

    const { data: existing } = await supabase
      .from("student_charges")
      .select("id")
      .eq("student_id", studentId)
      .eq("fee_structure_id", feeStructureId)
      .maybeSingle();
    if (existing) return { success: false, error: "This student already has that charge." };

    const { error } = await supabase.from("student_charges").insert({
      student_id: studentId,
      fee_structure_id: feeStructureId,
      amount_due: (fs as { amount: number }).amount,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/admin/students/${studentId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// Individual, one-off charge for a single student — a late-registration
// fee, a damaged-book fine, etc. — bypassing the fee_structures pipeline
// entirely, since that's inherently cohort-scoped (a whole subject or
// class), not per-student.
export async function createAdHocCharge(
  studentId: string,
  description: string,
  amount: number
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    if (!description || amount <= 0) {
      return { success: false, error: "Description and a positive amount are required." };
    }

    const { data: student } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("id", studentId)
      .eq("organization_id", organizationId)
      .single();
    if (!student) return { success: false, error: "Student not found." };

    const { error } = await supabase.from("student_charges").insert({
      student_id: studentId,
      description,
      amount_due: amount,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/admin/students/${studentId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateCharge(
  chargeId: string,
  studentId: string,
  input: { description: string; amount_due: number }
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    if (!input.description || input.amount_due <= 0) {
      return { success: false, error: "Description and a positive amount are required." };
    }

    const { data: allocated } = await supabase
      .from("payment_allocations")
      .select("amount_allocated")
      .eq("student_charge_id", chargeId);
    const paid = ((allocated as { amount_allocated: number }[]) ?? []).reduce(
      (s, a) => s + a.amount_allocated,
      0
    );
    if (input.amount_due < paid) {
      return {
        success: false,
        error: `Amount can't be less than the GH₵${paid} already paid against this charge.`,
      };
    }

    const { error } = await supabase
      .from("student_charges")
      .update({ description: input.description, amount_due: input.amount_due })
      .eq("id", chargeId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/admin/students/${studentId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// Only removable while unpaid — deleting a charge with payments already
// allocated to it would cascade-delete those payment_allocations rows too,
// silently erasing a record of money actually received.
export async function deleteCharge(chargeId: string, studentId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { data: allocated } = await supabase
      .from("payment_allocations")
      .select("id")
      .eq("student_charge_id", chargeId)
      .limit(1);
    if (allocated && allocated.length > 0) {
      return { success: false, error: "This charge has a payment recorded against it and can't be deleted." };
    }

    const { error } = await supabase.from("student_charges").delete().eq("id", chargeId);
    if (error) return { success: false, error: error.message };

    revalidatePath(`/admin/students/${studentId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// Materializes student_charges from active fee_structures for the given
// term — skips students who already have that charge. Mirrors the
// "generate sessions from schedule" pattern from Phase 4. Two shapes of
// fee_structures are handled: SUBJECT fees bill everyone enrolled in that
// class_subject (student_subjects); MATERIALS fees bill everyone actively
// enrolled in the class as a whole (student_enrollments), regardless of
// which subjects they're taking.
export async function generateChargesForTerm(termId: string): Promise<ActionResult<{ created: number }>> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { data: feeStructures } = await supabase
      .from("fee_structures")
      .select("id, fee_type, class_subject_id, class_id, amount, academic_year_id")
      .eq("term_id", termId)
      .eq("active", true)
      .eq("organization_id", organizationId);

    if (!feeStructures || feeStructures.length === 0) {
      return { success: true, data: { created: 0 } };
    }

    let created = 0;
    for (const fs of feeStructures as {
      id: string;
      fee_type: "SUBJECT" | "MATERIALS";
      class_subject_id: string | null;
      class_id: string | null;
      amount: number;
      academic_year_id: string;
    }[]) {
      let studentIds: string[] = [];

      if (fs.fee_type === "MATERIALS" && fs.class_id) {
        const { data: enrolled } = await supabase
          .from("student_enrollments")
          .select("student_id")
          .eq("class_id", fs.class_id)
          .eq("academic_year_id", fs.academic_year_id)
          .eq("status", "ACTIVE");
        studentIds = ((enrolled as { student_id: string }[]) ?? []).map((e) => e.student_id);
      } else if (fs.class_subject_id) {
        const { data: enrolled } = await supabase
          .from("student_subjects")
          .select("student_id")
          .eq("class_subject_id", fs.class_subject_id);
        studentIds = ((enrolled as { student_id: string }[]) ?? []).map((e) => e.student_id);
      }

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
