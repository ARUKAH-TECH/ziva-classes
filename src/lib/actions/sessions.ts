"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { requireTeacher } from "@/lib/auth/require-teacher";
import type { SessionType } from "@/lib/constants";

export interface SessionRow {
  id: string;
  class_subject_id: string;
  class_name: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  session_type: SessionType;
  location: string | null;
  status: string;
  attendance_taken: boolean;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

async function mapSessionRows(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  data: unknown[]
): Promise<SessionRow[]> {
  type Nested = { name: string } | { name: string }[] | null;
  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type Raw = {
    id: string;
    class_subject_id: string;
    teacher_id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    session_type: SessionType;
    location: string | null;
    status: string;
    class_subjects: { classes: Nested; subjects: Nested } | { classes: Nested; subjects: Nested }[] | null;
    teacher_profiles: { users: U } | { users: U }[] | null;
    attendance: { id: string }[] | null;
  };

  return (data as Raw[]).map((row) => {
    const cs = one(row.class_subjects);
    const teacher = one(one(row.teacher_profiles)?.users ?? null);
    return {
      id: row.id,
      class_subject_id: row.class_subject_id,
      class_name: one(cs?.classes ?? null)?.name ?? "—",
      subject_name: one(cs?.subjects ?? null)?.name ?? "—",
      teacher_id: row.teacher_id,
      teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : "—",
      session_date: row.session_date,
      start_time: row.start_time,
      end_time: row.end_time,
      session_type: row.session_type,
      location: row.location,
      status: row.status,
      attendance_taken: (row.attendance?.length ?? 0) > 0,
    };
  });
}

// class_subjects/classes use !inner so nested filters (e.g. organization_id
// scoping below) are actually honored by PostgREST — a plain left-joined
// embed can't be filtered on, only selected.
const SESSION_SELECT =
  "id, class_subject_id, teacher_id, session_date, start_time, end_time, session_type, location, status, class_subjects!inner(classes!inner(name, organization_id), subjects(name)), teacher_profiles(users(first_name, last_name)), attendance(id)";

export async function listSessionsForDate(date: string): Promise<SessionRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("class_sessions")
    .select(SESSION_SELECT)
    .eq("session_date", date)
    .eq("class_subjects.classes.organization_id", organizationId)
    .order("start_time", { ascending: true });

  return mapSessionRows(supabase, data ?? []);
}

export async function listMySessionsForDate(date: string): Promise<SessionRow[]> {
  const { supabase, teacherId } = await requireTeacher();

  const { data } = await supabase
    .from("class_sessions")
    .select(SESSION_SELECT)
    .eq("session_date", date)
    .eq("teacher_id", teacherId)
    .order("start_time", { ascending: true });

  return mapSessionRows(supabase, data ?? []);
}

export async function listMyUpcomingSessions(fromDate: string, days = 7): Promise<SessionRow[]> {
  const { supabase, teacherId } = await requireTeacher();

  const to = new Date(fromDate);
  to.setDate(to.getDate() + days);
  const toDate = to.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("class_sessions")
    .select(SESSION_SELECT)
    .eq("teacher_id", teacherId)
    .gte("session_date", fromDate)
    .lte("session_date", toDate)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  return mapSessionRows(supabase, data ?? []);
}

// Materializes class_sessions for a given date from any active
// class_schedules whose day_of_week matches — skips schedules that already
// have a session on that date. For HOME_SERVICE schedules, snapshots the
// student's current location onto the session (Rule 11) when exactly one
// student is actively enrolled in that class (the common home-service
// shape); left blank otherwise since class_sessions has one location field
// per session, not per student.
export async function generateSessionsForDate(date: string): Promise<ActionResult<{ created: number }>> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const dayOfWeek = new Date(date + "T00:00:00").getDay();

    const { data: schedules } = await supabase
      .from("class_schedules")
      .select("id, class_subject_id, teacher_id, start_time, end_time, session_type, location")
      .eq("organization_id", organizationId)
      .eq("day_of_week", dayOfWeek)
      .eq("active", true);

    if (!schedules || schedules.length === 0) {
      return { success: true, data: { created: 0 } };
    }

    const { data: existing } = await supabase
      .from("class_sessions")
      .select("schedule_id")
      .eq("session_date", date)
      .in(
        "schedule_id",
        schedules.map((s) => s.id)
      );

    const existingScheduleIds = new Set((existing ?? []).map((e) => (e as { schedule_id: string }).schedule_id));
    const toCreate = schedules.filter((s) => !existingScheduleIds.has(s.id));

    if (toCreate.length === 0) {
      return { success: true, data: { created: 0 } };
    }

    const rows = await Promise.all(
      toCreate.map(async (s) => {
        let locationSnapshot: string | null = null;

        if (s.session_type === "HOME_SERVICE") {
          const { data: enrolled } = await supabase
            .from("student_subjects")
            .select("student_id")
            .eq("class_subject_id", s.class_subject_id);

          if (enrolled && enrolled.length === 1) {
            const { data: loc } = await supabase
              .from("student_locations")
              .select("address, area, city")
              .eq("student_id", (enrolled[0] as { student_id: string }).student_id)
              .eq("is_current", true)
              .single();
            if (loc) {
              const l = loc as { address: string | null; area: string | null; city: string | null };
              locationSnapshot = [l.address, l.area, l.city].filter(Boolean).join(", ") || null;
            }
          }
        }

        return {
          schedule_id: s.id,
          class_subject_id: s.class_subject_id,
          teacher_id: s.teacher_id,
          session_date: date,
          start_time: s.start_time,
          end_time: s.end_time,
          session_type: s.session_type,
          location: s.location,
          student_location_snapshot: locationSnapshot,
          status: "SCHEDULED",
        };
      })
    );

    const { error } = await supabase.from("class_sessions").insert(rows);
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/attendance");
    revalidatePath("/admin/timetable");
    return { success: true, data: { created: rows.length } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function createAdHocSession(input: {
  class_subject_id: string;
  teacher_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  session_type: SessionType;
  location: string;
}): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("class_sessions").insert({
      class_subject_id: input.class_subject_id,
      teacher_id: input.teacher_id,
      session_date: input.session_date,
      start_time: input.start_time,
      end_time: input.end_time,
      session_type: input.session_type,
      location: input.location || null,
      status: "SCHEDULED",
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/attendance");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
