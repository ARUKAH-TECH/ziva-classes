"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/auth/require-admin";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { createClient } from "@/lib/supabase/server";

export type Priority = "LOW" | "MEDIUM" | "HIGH";
export type NeedStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export type InterventionStatus = "ACTIVE" | "COMPLETED" | "DISCONTINUED";

export interface InterventionRow {
  id: string;
  intervention: string;
  assigned_teacher_name: string | null;
  review_date: string | null;
  outcome: string | null;
  status: InterventionStatus;
}

export interface StudentNeedRow {
  id: string;
  student_id: string;
  student_name: string;
  subject_name: string | null;
  need_description: string;
  priority: Priority;
  recommended_support: string | null;
  identified_by_name: string | null;
  status: NeedStatus;
  visible_to_parent: boolean;
  created_at: string;
  interventions: InterventionRow[];
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

async function staffClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  return supabase;
}

function mapNeedRows(data: unknown[]): StudentNeedRow[] {
  type Nested = { name: string } | { name: string }[] | null;
  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type InterventionRaw = {
    id: string;
    intervention: string;
    review_date: string | null;
    outcome: string | null;
    status: InterventionStatus;
    teacher_profiles: { users: U } | { users: U }[] | null;
  };
  type Raw = {
    id: string;
    student_id: string;
    need_description: string;
    priority: Priority;
    recommended_support: string | null;
    status: NeedStatus;
    visible_to_parent: boolean;
    created_at: string;
    student_profiles: U;
    subjects: Nested;
    users: U;
    interventions: InterventionRaw[] | null;
  };

  return (data as Raw[]).map((row) => {
    const student = one(row.student_profiles);
    const identifier = one(row.users);
    return {
      id: row.id,
      student_id: row.student_id,
      student_name: student ? `${student.first_name} ${student.last_name}` : "—",
      subject_name: one(row.subjects)?.name ?? null,
      need_description: row.need_description,
      priority: row.priority,
      recommended_support: row.recommended_support,
      identified_by_name: identifier ? `${identifier.first_name} ${identifier.last_name}` : null,
      status: row.status,
      visible_to_parent: row.visible_to_parent,
      created_at: row.created_at,
      interventions: (row.interventions ?? []).map((iv) => {
        const t = one(one(iv.teacher_profiles)?.users ?? null);
        return {
          id: iv.id,
          intervention: iv.intervention,
          assigned_teacher_name: t ? `${t.first_name} ${t.last_name}` : null,
          review_date: iv.review_date,
          outcome: iv.outcome,
          status: iv.status,
        };
      }),
    };
  });
}

const NEED_SELECT =
  "id, student_id, need_description, priority, recommended_support, status, visible_to_parent, created_at, student_profiles(first_name, last_name), subjects(name), users(first_name, last_name), interventions(id, intervention, review_date, outcome, status, teacher_profiles(users(first_name, last_name)))";

// Works for admin (org-wide) and teacher (own assigned students, per
// needs_teacher_manage RLS) — RLS decides which rows come back.
export async function listStudentNeeds(studentId?: string): Promise<StudentNeedRow[]> {
  const supabase = await staffClient();
  let query = supabase.from("student_needs").select(NEED_SELECT).order("created_at", { ascending: false });
  if (studentId) query = query.eq("student_id", studentId);
  const { data } = await query;
  return mapNeedRows(data ?? []);
}

export async function createStudentNeed(input: {
  student_id: string;
  subject_id: string;
  need_description: string;
  priority: Priority;
  recommended_support: string;
  visible_to_parent: boolean;
}): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireTeacher();

    if (!input.student_id || !input.need_description) {
      return { success: false, error: "Student and a need description are required." };
    }

    const { error } = await supabase.from("student_needs").insert({
      student_id: input.student_id,
      subject_id: input.subject_id || null,
      need_description: input.need_description,
      priority: input.priority,
      recommended_support: input.recommended_support || null,
      identified_by: userId,
      visible_to_parent: input.visible_to_parent,
      status: "OPEN",
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/teacher/support");
    revalidatePath("/admin/support");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function setNeedStatus(id: string, status: NeedStatus): Promise<ActionResult> {
  try {
    const supabase = await staffClient();
    const { error } = await supabase.from("student_needs").update({ status }).eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/teacher/support");
    revalidatePath("/admin/support");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function addIntervention(input: {
  student_need_id: string;
  intervention: string;
  review_date: string;
}): Promise<ActionResult> {
  try {
    const { supabase, teacherId } = await requireTeacher();

    if (!input.intervention) return { success: false, error: "Describe the intervention." };

    const { error } = await supabase.from("interventions").insert({
      student_need_id: input.student_need_id,
      assigned_teacher_id: teacherId,
      intervention: input.intervention,
      review_date: input.review_date || null,
      status: "ACTIVE",
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/teacher/support");
    revalidatePath("/admin/support");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateInterventionOutcome(
  id: string,
  input: { outcome: string; status: InterventionStatus }
): Promise<ActionResult> {
  try {
    const supabase = await staffClient();
    const { error } = await supabase
      .from("interventions")
      .update({ outcome: input.outcome || null, status: input.status })
      .eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/teacher/support");
    revalidatePath("/admin/support");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export interface RosterOption {
  student_id: string;
  name: string;
}

// Students enrolled in a given class+subject — feeds the "flag a need"
// student picker, scoped to the teacher's own assignments via RLS on
// student_subjects (student_subjects_teacher_view).
export async function listStudentsForClassSubject(classSubjectId: string): Promise<RosterOption[]> {
  const supabase = await staffClient();

  const { data } = await supabase
    .from("student_subjects")
    .select("student_profiles(id, first_name, last_name)")
    .eq("class_subject_id", classSubjectId);

  type S = { id: string; first_name: string; last_name: string };
  type Raw = { student_profiles: S | S[] | null };

  return ((data as Raw[]) ?? [])
    .map((r) => one(r.student_profiles))
    .filter((s): s is S => s !== null)
    .map((s) => ({ student_id: s.id, name: `${s.first_name} ${s.last_name}` }));
}

// Parent-facing: only needs/interventions explicitly marked
// visible_to_parent — internal-only notes never reach this query, per §26.
export async function listVisibleNeedsForChild(studentId: string): Promise<StudentNeedRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_needs")
    .select(NEED_SELECT)
    .eq("student_id", studentId)
    .eq("visible_to_parent", true)
    .order("created_at", { ascending: false });
  return mapNeedRows(data ?? []);
}

// Optional student account viewing their own visible needs.
export async function listMyOwnVisibleNeeds(): Promise<StudentNeedRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("optional_user_id", user.id)
    .single();
  const studentId = (student as { id: string } | null)?.id;
  if (!studentId) return [];

  return listVisibleNeedsForChild(studentId);
}
