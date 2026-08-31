"use server";

// Wipes every Student, Parent, Teacher, and regular Admin (plus everything
// tied to them — fees, payments, attendance, scores, lesson notes, terminal
// reports, timetable slots) so the school can be handed to a new client with
// a clean slate. Super Admin only, gated a second time by a typed
// confirmation phrase, since this is irreversible.

import { requireSuperAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { RESET_CONFIRMATION_PHRASE } from "@/lib/reset-confirmation";

export interface ResetSummary {
  studentsDeleted: number;
  teachersDeleted: number;
  parentsDeleted: number;
  adminsDeleted: number;
  loginFailures: number;
}

export async function resetForNewClient(confirmation: string): Promise<ActionResult<ResetSummary>> {
  try {
    const { organizationId } = await requireSuperAdmin();

    if (confirmation.trim() !== RESET_CONFIRMATION_PHRASE) {
      return { success: false, error: `Type "${RESET_CONFIRMATION_PHRASE}" exactly to confirm.` };
    }

    const admin = createAdminClient();
    let loginFailures = 0;

    // Students aren't keyed off users.id — optional_user_id is an optional,
    // SET-NULL-on-delete link to their login (most Primary students don't
    // have one at all) — so deleting a login account here would NOT cascade
    // away the student_profiles row itself. Delete the login first, then
    // bulk-delete the profiles; every other student-linked table
    // (enrollments, scores, attendance, charges → payment allocations,
    // terminal reports, lesson-note feedback, schedule links...) cascades
    // away via the existing ON DELETE CASCADE constraints.
    const { data: students } = await admin
      .from("student_profiles")
      .select("id, optional_user_id")
      .eq("organization_id", organizationId);
    const studentRows = (students as { id: string; optional_user_id: string | null }[]) ?? [];

    for (const s of studentRows) {
      if (s.optional_user_id) {
        const { error } = await admin.auth.admin.deleteUser(s.optional_user_id);
        if (error) loginFailures++;
      }
    }

    if (studentRows.length > 0) {
      const { error } = await admin.from("student_profiles").delete().eq("organization_id", organizationId);
      if (error) throw new Error(error.message);
    }

    // Teachers, Parents, and regular Admins are each a real Supabase Auth
    // account (users.id → auth.users.id, ON DELETE CASCADE), so deleting the
    // auth account cascades all the way through users → their profile table
    // → everything downstream (assignments, schedules, lesson notes,
    // feedback, messages, notifications...) automatically. Super Admin
    // accounts are deliberately excluded from this query.
    const { data: people } = await admin
      .from("users")
      .select("id, role")
      .eq("organization_id", organizationId)
      .in("role", ["TEACHER", "PARENT", "ADMIN"]);
    const peopleRows = (people as { id: string; role: string }[]) ?? [];

    let teachersDeleted = 0;
    let parentsDeleted = 0;
    let adminsDeleted = 0;

    for (const p of peopleRows) {
      const { error } = await admin.auth.admin.deleteUser(p.id);
      if (error) {
        loginFailures++;
        continue;
      }
      if (p.role === "TEACHER") teachersDeleted++;
      else if (p.role === "PARENT") parentsDeleted++;
      else if (p.role === "ADMIN") adminsDeleted++;
    }

    return {
      success: true,
      data: {
        studentsDeleted: studentRows.length,
        teachersDeleted,
        parentsDeleted,
        adminsDeleted,
        loginFailures,
      },
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
