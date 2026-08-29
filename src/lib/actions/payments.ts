"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { notifyParentsOfStudent } from "@/lib/notifications";

// Payment methods are ONLY these two — GCB and any other bank must never
// appear anywhere in the application (Rules 7-8).
export type PaymentMethod = "MTN_MOBILE_MONEY" | "CASH";

export interface PaymentRow {
  id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference: string | null;
  payment_date: string;
  notes: string | null;
  recorded_by_name: string | null;
  allocations: { subject_name: string; amount_allocated: number }[];
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

export async function listPayments(studentId: string): Promise<PaymentRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("payments")
    .select(
      "id, amount, payment_method, reference, payment_date, notes, users(first_name, last_name), payment_allocations(amount_allocated, student_charges(fee_structures(fee_type, description, class_subjects(subjects(name)))))"
    )
    .eq("student_id", studentId)
    .order("payment_date", { ascending: false });

  type Nested = { name: string } | { name: string }[] | null;
  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type FS = {
    fee_type: "SUBJECT" | "MATERIALS";
    description: string | null;
    class_subjects: { subjects: Nested } | { subjects: Nested }[] | null;
  };
  type Alloc = {
    amount_allocated: number;
    student_charges: { fee_structures: FS | FS[] | null } | { fee_structures: FS | FS[] | null }[] | null;
  };
  type Raw = {
    id: string;
    amount: number;
    payment_method: PaymentMethod;
    reference: string | null;
    payment_date: string;
    notes: string | null;
    users: U;
    payment_allocations: Alloc[] | null;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const recorder = one(row.users);
    const allocations = (row.payment_allocations ?? []).map((a) => {
      const sc = one(a.student_charges);
      const fs = one(sc?.fee_structures ?? null);
      const cs = one(fs?.class_subjects ?? null);
      const subjectName =
        fs?.fee_type === "MATERIALS" ? fs.description ?? "Materials" : one(cs?.subjects ?? null)?.name ?? "—";
      return { subject_name: subjectName, amount_allocated: a.amount_allocated };
    });

    return {
      id: row.id,
      amount: row.amount,
      payment_method: row.payment_method,
      reference: row.reference,
      payment_date: row.payment_date,
      notes: row.notes,
      recorded_by_name: recorder ? `${recorder.first_name} ${recorder.last_name}` : null,
      allocations,
    };
  });
}

export interface PaymentReceipt {
  id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference: string | null;
  payment_date: string;
  notes: string | null;
  recorded_by_name: string | null;
  allocations: { subject_name: string; amount_allocated: number }[];
  student_name: string;
  student_number: string;
}

// For the printable receipt (see /api/payments/[id]/receipt). Deliberately
// not admin-gated — a parent should be able to print their own child's
// receipt. Uses the caller's own session (not the admin client), so the
// same RLS policies that already let a parent read their child's payments
// via listPayments are what scope this too — an admin sees any payment in
// their org, a parent only their own children's, and anyone else gets null.
export async function getPaymentReceipt(paymentId: string): Promise<PaymentReceipt | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("payments")
    .select(
      "id, amount, payment_method, reference, payment_date, notes, users(first_name, last_name), student_profiles!inner(first_name, last_name, student_number), payment_allocations(amount_allocated, student_charges(fee_structures(fee_type, description, class_subjects(subjects(name)))))"
    )
    .eq("id", paymentId)
    .single();

  if (!data) return null;

  type Nested = { name: string } | { name: string }[] | null;
  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type SP = { first_name: string; last_name: string; student_number: string } | { first_name: string; last_name: string; student_number: string }[] | null;
  type FS = {
    fee_type: "SUBJECT" | "MATERIALS";
    description: string | null;
    class_subjects: { subjects: Nested } | { subjects: Nested }[] | null;
  };
  type Alloc = {
    amount_allocated: number;
    student_charges: { fee_structures: FS | FS[] | null } | { fee_structures: FS | FS[] | null }[] | null;
  };
  type Raw = {
    id: string;
    amount: number;
    payment_method: PaymentMethod;
    reference: string | null;
    payment_date: string;
    notes: string | null;
    users: U;
    student_profiles: SP;
    payment_allocations: Alloc[] | null;
  };

  const row = data as Raw;
  const recorder = one(row.users);
  const student = one(row.student_profiles);
  if (!student) return null;

  const allocations = (row.payment_allocations ?? []).map((a) => {
    const sc = one(a.student_charges);
    const fs = one(sc?.fee_structures ?? null);
    const cs = one(fs?.class_subjects ?? null);
    const subjectName =
      fs?.fee_type === "MATERIALS" ? fs.description ?? "Materials" : one(cs?.subjects ?? null)?.name ?? "—";
    return { subject_name: subjectName, amount_allocated: a.amount_allocated };
  });

  return {
    id: row.id,
    amount: row.amount,
    payment_method: row.payment_method,
    reference: row.reference,
    payment_date: row.payment_date,
    notes: row.notes,
    recorded_by_name: recorder ? `${recorder.first_name} ${recorder.last_name}` : null,
    allocations,
    student_name: `${student.first_name} ${student.last_name}`,
    student_number: student.student_number,
  };
}

export interface RecentPaymentRow {
  id: string;
  student_id: string;
  student_name: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
}

export interface AllPaymentRow {
  id: string;
  student_id: string;
  student_name: string;
  student_number: string;
  amount: number;
  payment_method: PaymentMethod;
  reference: string | null;
  payment_date: string;
}

// Every payment/receipt in the org, newest first — backs the Receipts page
// so an admin can find and print any student's receipt without first
// navigating into that student's own profile.
export async function listAllPayments(): Promise<AllPaymentRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("payments")
    .select(
      "id, student_id, amount, payment_method, reference, payment_date, student_profiles!inner(first_name, last_name, student_number, organization_id)"
    )
    .eq("student_profiles.organization_id", organizationId)
    .order("payment_date", { ascending: false });

  type SP =
    | { first_name: string; last_name: string; student_number: string }
    | { first_name: string; last_name: string; student_number: string }[]
    | null;
  type Raw = {
    id: string;
    student_id: string;
    amount: number;
    payment_method: PaymentMethod;
    reference: string | null;
    payment_date: string;
    student_profiles: SP;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const s = one(row.student_profiles);
    return {
      id: row.id,
      student_id: row.student_id,
      student_name: s ? `${s.first_name} ${s.last_name}` : "—",
      student_number: s?.student_number ?? "—",
      amount: row.amount,
      payment_method: row.payment_method,
      reference: row.reference,
      payment_date: row.payment_date,
    };
  });
}

export async function listRecentPayments(limit = 8): Promise<RecentPaymentRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("payments")
    .select("id, student_id, amount, payment_method, payment_date, student_profiles!inner(first_name, last_name, organization_id)")
    .eq("student_profiles.organization_id", organizationId)
    .order("payment_date", { ascending: false })
    .limit(limit);

  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type Raw = {
    id: string;
    student_id: string;
    amount: number;
    payment_method: PaymentMethod;
    payment_date: string;
    student_profiles: U;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const u = one(row.student_profiles);
    return {
      id: row.id,
      student_id: row.student_id,
      student_name: u ? `${u.first_name} ${u.last_name}` : "—",
      amount: row.amount,
      payment_method: row.payment_method,
      payment_date: row.payment_date,
    };
  });
}

export async function createPayment(input: {
  student_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference: string;
  notes: string;
  allocations: { student_charge_id: string; amount_allocated: number }[];
}): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAdmin();

    if (input.amount <= 0) {
      return { success: false, error: "Amount must be greater than zero." };
    }
    const totalAllocated = input.allocations.reduce((sum, a) => sum + a.amount_allocated, 0);
    if (totalAllocated > input.amount + 0.001) {
      return { success: false, error: "Allocated amount cannot exceed the payment amount." };
    }
    if (input.allocations.some((a) => a.amount_allocated <= 0)) {
      return { success: false, error: "Allocation amounts must be greater than zero." };
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        student_id: input.student_id,
        amount: input.amount,
        payment_method: input.payment_method,
        reference: input.reference || null,
        notes: input.notes || null,
        recorded_by: userId,
      })
      .select("id")
      .single();

    if (paymentError || !payment) {
      return { success: false, error: paymentError?.message ?? "Could not record payment." };
    }

    const paymentId = (payment as { id: string }).id;

    if (input.allocations.length > 0) {
      const { error: allocError } = await supabase.from("payment_allocations").insert(
        input.allocations.map((a) => ({
          payment_id: paymentId,
          student_charge_id: a.student_charge_id,
          amount_allocated: a.amount_allocated,
        }))
      );

      if (allocError) {
        await supabase.from("payments").delete().eq("id", paymentId);
        return { success: false, error: allocError.message };
      }
    }

    await notifyParentsOfStudent(
      input.student_id,
      "Payment received",
      `A payment of GH₵${input.amount} was recorded${input.reference ? ` (ref: ${input.reference})` : ""}. A printable receipt is available on the Fees & Payments page.`,
      "PAYMENT_RECEIVED"
    );

    revalidatePath("/admin/fees");
    revalidatePath(`/admin/students/${input.student_id}`);
    revalidatePath("/parent/fees");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export interface FinancialDashboardStats {
  total_collected: number;
  today_collection: number;
  month_collection: number;
  outstanding_fees: number;
  momo_collection: number;
  cash_collection: number;
  revenue_by_subject: { subject_name: string; amount: number }[];
  revenue_by_class: { class_name: string; amount: number }[];
}

export async function getFinancialDashboardStats(): Promise<FinancialDashboardStats> {
  const { supabase, organizationId } = await requireAdmin();

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, payment_method, payment_date, student_profiles!inner(organization_id)")
    .eq("student_profiles.organization_id", organizationId);

  type P = { id: string; amount: number; payment_method: PaymentMethod; payment_date: string };
  const rows = (payments as (P & { student_profiles: unknown })[]) ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const monthPrefix = today.slice(0, 7);

  const total_collected = rows.reduce((sum, p) => sum + p.amount, 0);
  const today_collection = rows.filter((p) => p.payment_date.slice(0, 10) === today).reduce((s, p) => s + p.amount, 0);
  const month_collection = rows.filter((p) => p.payment_date.slice(0, 7) === monthPrefix).reduce((s, p) => s + p.amount, 0);
  const momo_collection = rows.filter((p) => p.payment_method === "MTN_MOBILE_MONEY").reduce((s, p) => s + p.amount, 0);
  const cash_collection = rows.filter((p) => p.payment_method === "CASH").reduce((s, p) => s + p.amount, 0);

  const { data: allocations } = await supabase
    .from("payment_allocations")
    .select(
      "amount_allocated, payment_id, student_charges(fee_structures(fee_type, description, classes(name), class_subjects(classes(name), subjects(name))))"
    )
    .in(
      "payment_id",
      rows.map((p) => p.id)
    );

  type Nested = { name: string } | { name: string }[] | null;
  type CS = { classes: Nested; subjects: Nested } | { classes: Nested; subjects: Nested }[] | null;
  type FS = {
    fee_type: "SUBJECT" | "MATERIALS";
    description: string | null;
    classes: Nested;
    class_subjects: CS;
  };
  type SC = { fee_structures: FS | FS[] | null } | { fee_structures: FS | FS[] | null }[] | null;
  type AllocRaw = { amount_allocated: number; student_charges: SC };

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  const bySubject = new Map<string, number>();
  const byClass = new Map<string, number>();

  ((allocations as AllocRaw[]) ?? []).forEach((a) => {
    const sc = one(a.student_charges);
    const fs = one(sc?.fee_structures ?? null);
    const cs = one(fs?.class_subjects ?? null);
    const isMaterials = fs?.fee_type === "MATERIALS";
    const subjectName = isMaterials ? fs.description ?? "Materials" : one(cs?.subjects ?? null)?.name ?? "—";
    const className = isMaterials ? one(fs.classes)?.name ?? "—" : one(cs?.classes ?? null)?.name ?? "—";
    bySubject.set(subjectName, (bySubject.get(subjectName) ?? 0) + a.amount_allocated);
    byClass.set(className, (byClass.get(className) ?? 0) + a.amount_allocated);
  });

  const { data: charges } = await supabase
    .from("student_charges")
    .select("id, amount_due, student_profiles!inner(organization_id)")
    .eq("student_profiles.organization_id", organizationId);

  const chargeRows = (charges as { id: string; amount_due: number }[]) ?? [];
  const totalDue = chargeRows.reduce((s, c) => s + c.amount_due, 0);
  const totalAllocatedAll = ((allocations as AllocRaw[]) ?? []).reduce((s, a) => s + a.amount_allocated, 0);

  return {
    total_collected: round2(total_collected),
    today_collection: round2(today_collection),
    month_collection: round2(month_collection),
    outstanding_fees: round2(Math.max(0, totalDue - totalAllocatedAll)),
    momo_collection: round2(momo_collection),
    cash_collection: round2(cash_collection),
    revenue_by_subject: Array.from(bySubject.entries())
      .map(([subject_name, amount]) => ({ subject_name, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount),
    revenue_by_class: Array.from(byClass.entries())
      .map(([class_name, amount]) => ({ class_name, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
