"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { requireParent } from "@/lib/auth/require-parent";

export type TeacherFeedbackStatus = "NEW" | "ACKNOWLEDGED" | "RESOLVED";

export interface TeacherFeedbackRow {
  id: string;
  parent_id: string;
  parent_name: string;
  student_id: string;
  student_name: string;
  teacher_id: string;
  teacher_name: string;
  message: string;
  request_teacher_change: boolean;
  status: TeacherFeedbackStatus;
  admin_response: string | null;
  responded_by_name: string | null;
  responded_at: string | null;
  created_at: string;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

async function verifyParentOwnsStudent(
  supabase: Awaited<ReturnType<typeof requireParent>>["supabase"],
  parentId: string,
  studentId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", parentId)
    .eq("student_id", studentId)
    .maybeSingle();
  return !!data;
}

export interface StudentTeacherOption {
  teacher_id: string;
  teacher_name: string;
  subject_name: string;
}

// The teachers a parent can leave feedback about for a given child — exactly
// the teachers actually assigned to that child's enrolled subjects, not the
// whole staff list.
export async function listTeachersForChild(studentId: string): Promise<StudentTeacherOption[]> {
  const { supabase, parentId } = await requireParent();

  if (!(await verifyParentOwnsStudent(supabase, parentId, studentId))) return [];

  const { data } = await supabase
    .from("student_subjects")
    .select(
      "class_subjects(subjects(name), teacher_assignments(active, teacher_profiles(id, users(first_name, last_name))))"
    )
    .eq("student_id", studentId);

  type Nested = { name: string } | { name: string }[] | null;
  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type TP = { id: string; users: U } | { id: string; users: U }[] | null;
  type TA = { active: boolean; teacher_profiles: TP } | { active: boolean; teacher_profiles: TP }[];
  type CS = { subjects: Nested; teacher_assignments: TA | null };
  type Raw = { class_subjects: CS | CS[] | null };

  const seen = new Set<string>();
  const options: StudentTeacherOption[] = [];

  ((data as Raw[]) ?? []).forEach((row) => {
    const cs = one(row.class_subjects);
    if (!cs) return;
    const subjectName = one(cs.subjects ?? null)?.name ?? "—";
    const assignments = Array.isArray(cs.teacher_assignments)
      ? cs.teacher_assignments
      : cs.teacher_assignments
      ? [cs.teacher_assignments]
      : [];

    assignments
      .filter((a) => a.active)
      .forEach((a) => {
        const teacher = one(a.teacher_profiles);
        if (!teacher) return;
        const u = one(teacher.users);
        if (!u) return;
        const key = `${teacher.id}|${subjectName}`;
        if (seen.has(key)) return;
        seen.add(key);
        options.push({ teacher_id: teacher.id, teacher_name: `${u.first_name} ${u.last_name}`, subject_name: subjectName });
      });
  });

  return options.sort((a, b) => a.teacher_name.localeCompare(b.teacher_name));
}

export async function submitTeacherFeedback(input: {
  student_id: string;
  teacher_id: string;
  message: string;
  request_teacher_change: boolean;
}): Promise<ActionResult> {
  try {
    const { supabase, parentId, organizationId } = await requireParent();

    if (!input.student_id || !input.teacher_id || !input.message.trim()) {
      return { success: false, error: "Choose a child, a teacher, and enter your feedback." };
    }
    if (!(await verifyParentOwnsStudent(supabase, parentId, input.student_id))) {
      return { success: false, error: "You do not have access to this student." };
    }

    const { error } = await supabase.from("teacher_feedback").insert({
      organization_id: organizationId,
      parent_id: parentId,
      student_id: input.student_id,
      teacher_id: input.teacher_id,
      message: input.message.trim(),
      request_teacher_change: input.request_teacher_change,
      status: "NEW",
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/parent/teacher-feedback");
    revalidatePath("/admin/teacher-feedback");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

const TEACHER_FEEDBACK_SELECT =
  "id, parent_id, student_id, teacher_id, message, request_teacher_change, status, admin_response, responded_at, created_at, parent_profiles(users(first_name, last_name)), student_profiles(first_name, last_name), teacher_profiles(users(first_name, last_name)), responder:users!teacher_feedback_responded_by_fkey(first_name, last_name)";

type Nested = { name: string } | { name: string }[] | null;
type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
type S = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
type Raw = {
  id: string;
  parent_id: string;
  student_id: string;
  teacher_id: string;
  message: string;
  request_teacher_change: boolean;
  status: TeacherFeedbackStatus;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
  parent_profiles: { users: U } | { users: U }[] | null;
  student_profiles: S;
  teacher_profiles: { users: U } | { users: U }[] | null;
  responder: U;
};

function mapRow(row: Raw): TeacherFeedbackRow {
  const parentUser = one(one(row.parent_profiles)?.users ?? null);
  const student = one(row.student_profiles);
  const teacherUser = one(one(row.teacher_profiles)?.users ?? null);
  const responder = one(row.responder);
  return {
    id: row.id,
    parent_id: row.parent_id,
    parent_name: parentUser ? `${parentUser.first_name} ${parentUser.last_name}` : "—",
    student_id: row.student_id,
    student_name: student ? `${student.first_name} ${student.last_name}` : "—",
    teacher_id: row.teacher_id,
    teacher_name: teacherUser ? `${teacherUser.first_name} ${teacherUser.last_name}` : "—",
    message: row.message,
    request_teacher_change: row.request_teacher_change,
    status: row.status,
    admin_response: row.admin_response,
    responded_by_name: responder ? `${responder.first_name} ${responder.last_name}` : null,
    responded_at: row.responded_at,
    created_at: row.created_at,
  };
}

// A parent's own submitted feedback, across all their children.
export async function listMyTeacherFeedback(): Promise<TeacherFeedbackRow[]> {
  const { supabase, parentId } = await requireParent();

  const { data } = await supabase
    .from("teacher_feedback")
    .select(TEACHER_FEEDBACK_SELECT)
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false });

  return ((data as unknown as Raw[]) ?? []).map(mapRow);
}

// Every parent's feedback about every teacher, org-wide — this is how it
// "links to the Super Admin" for review.
export async function listAllTeacherFeedback(): Promise<TeacherFeedbackRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("teacher_feedback")
    .select(TEACHER_FEEDBACK_SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  return ((data as unknown as Raw[]) ?? []).map(mapRow);
}

export async function respondToTeacherFeedback(
  id: string,
  input: { status: "ACKNOWLEDGED" | "RESOLVED"; admin_response: string }
): Promise<ActionResult> {
  try {
    const { supabase, organizationId, userId } = await requireAdmin();

    const { error } = await supabase
      .from("teacher_feedback")
      .update({
        status: input.status,
        admin_response: input.admin_response || null,
        responded_by: userId,
        responded_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/teacher-feedback");
    revalidatePath("/parent/teacher-feedback");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
