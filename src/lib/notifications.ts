import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationType =
  | "ATTENDANCE_ABSENT"
  | "RESULT_UPLOADED"
  | "TERMINAL_REPORT_PUBLISHED"
  | "FEE_REMINDER"
  | "PAYMENT_RECEIVED"
  | "CHANGE_REQUEST_DECIDED"
  | "ANNOUNCEMENT";

// Uses the service-role client rather than the triggering caller's own
// session. Notification delivery is a system-level side effect of actions
// like "teacher marks a student absent" — the supplied RLS has no
// teacher-visibility policy on parent_students at all, so if this ran
// under a teacher's session it would silently find zero parents and never
// notify anyone. This is the same "guarded server action, privileged
// client" pattern already used for account provisioning and parent photo
// change requests: the caller has already been authorized by the action
// that invoked this (attendance/scores/reports/etc were all written under
// proper RLS first), this step only looks up who to notify.
//
// Fire-and-forget: delivery should never block or fail the action that
// triggered it.
export async function notifyUser(userId: string, title: string, message: string, type: NotificationType): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({ user_id: userId, title, message, notification_type: type });
  } catch {
    // best-effort — swallow
  }
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

// Notifies every parent linked to a student (a student can have more than
// one guardian account attached) plus the student's own optional account.
export async function notifyParentsOfStudent(
  studentId: string,
  title: string,
  message: string,
  type: NotificationType
): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: links } = await admin
      .from("parent_students")
      .select("parent_profiles(user_id)")
      .eq("student_id", studentId);

    type U = { user_id: string } | { user_id: string }[] | null;
    type Raw = { parent_profiles: U };

    const userIds = ((links as Raw[]) ?? [])
      .map((l) => one(l.parent_profiles)?.user_id)
      .filter((id): id is string => !!id);

    await Promise.all(userIds.map((uid) => notifyUser(uid, title, message, type)));

    const { data: student } = await admin
      .from("student_profiles")
      .select("optional_user_id")
      .eq("id", studentId)
      .single();
    const studentUserId = (student as { optional_user_id: string | null } | null)?.optional_user_id;
    if (studentUserId) await notifyUser(studentUserId, title, message, type);
  } catch {
    // best-effort — swallow
  }
}
