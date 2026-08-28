"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { getStudentPhotoUrl } from "@/lib/actions/student-photo";
import { createClient } from "@/lib/supabase/server";
import { notifyParentsOfStudent } from "@/lib/notifications";
import { requireStudent } from "@/lib/auth/require-student";
import { requireParent } from "@/lib/auth/require-parent";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export interface RosterEntry {
  student_id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  status: AttendanceStatus | null;
  remarks: string | null;
}

export interface SessionInfo {
  id: string;
  class_name: string;
  subject_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  session_type: string;
  location: string | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

// Works for both admin and teacher callers — RLS (attendance_teacher_manage
// / attendance_admin_manage) decides whether the underlying rows are
// actually visible/writable; this just needs a signed-in session.
async function staffClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  return supabase;
}

export async function getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
  const supabase = await staffClient();

  const { data } = await supabase
    .from("class_sessions")
    .select(
      "id, session_date, start_time, end_time, session_type, location, class_subjects(classes(name), subjects(name))"
    )
    .eq("id", sessionId)
    .single();

  if (!data) return null;

  type Nested = { name: string } | { name: string }[] | null;
  type Raw = {
    id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    session_type: string;
    location: string | null;
    class_subjects: { classes: Nested; subjects: Nested } | { classes: Nested; subjects: Nested }[] | null;
  };
  const row = data as Raw;
  const cs = one(row.class_subjects);

  return {
    id: row.id,
    class_name: one(cs?.classes ?? null)?.name ?? "—",
    subject_name: one(cs?.subjects ?? null)?.name ?? "—",
    session_date: row.session_date,
    start_time: row.start_time,
    end_time: row.end_time,
    session_type: row.session_type,
    location: row.location,
  };
}

export async function getSessionRoster(sessionId: string): Promise<RosterEntry[]> {
  const supabase = await staffClient();

  const { data: session } = await supabase
    .from("class_sessions")
    .select("class_subject_id")
    .eq("id", sessionId)
    .single();

  const classSubjectId = (session as { class_subject_id: string } | null)?.class_subject_id;
  if (!classSubjectId) return [];

  const { data: enrolled } = await supabase
    .from("student_subjects")
    .select("student_profiles(id, first_name, last_name, passport_photo_path, status)")
    .eq("class_subject_id", classSubjectId);

  type S = { id: string; first_name: string; last_name: string; passport_photo_path: string | null; status: string };
  type Raw = { student_profiles: S | S[] | null };

  const students = ((enrolled as Raw[]) ?? [])
    .map((r) => one(r.student_profiles))
    .filter((s): s is S => s !== null && s.status === "ACTIVE")
    .sort((a, b) => a.first_name.localeCompare(b.first_name));

  const { data: existingAttendance } = await supabase
    .from("attendance")
    .select("student_id, status, remarks")
    .eq("session_id", sessionId);

  type A = { student_id: string; status: AttendanceStatus; remarks: string | null };
  const attendanceByStudent = new Map<string, A>();
  ((existingAttendance as A[]) ?? []).forEach((a) => attendanceByStudent.set(a.student_id, a));

  const photoUrls = await Promise.all(students.map((s) => getStudentPhotoUrl(s.passport_photo_path)));

  return students.map((s, i) => {
    const existing = attendanceByStudent.get(s.id);
    return {
      student_id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      photo_url: photoUrls[i],
      status: existing?.status ?? null,
      remarks: existing?.remarks ?? null,
    };
  });
}

export async function saveAttendance(
  sessionId: string,
  records: { student_id: string; status: AttendanceStatus; remarks: string }[]
): Promise<ActionResult> {
  try {
    const supabase = await staffClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const rows = records.map((r) => ({
      session_id: sessionId,
      student_id: r.student_id,
      status: r.status,
      remarks: r.remarks || null,
      recorded_by: user?.id ?? null,
      recorded_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert(rows, { onConflict: "session_id,student_id" });

    if (error) return { success: false, error: error.message };

    await supabase.from("class_sessions").update({ status: "COMPLETED" }).eq("id", sessionId);

    const absentees = records.filter((r) => r.status === "ABSENT");
    if (absentees.length > 0) {
      const info = await getSessionInfo(sessionId);
      if (info) {
        await Promise.all(
          absentees.map((r) =>
            notifyParentsOfStudent(
              r.student_id,
              "Absence recorded",
              `Absent from today's ${info.subject_name} session (${info.class_name}).`,
              "ATTENDANCE_ABSENT"
            )
          )
        );
      }
    }

    revalidatePath("/teacher/attendance");
    revalidatePath("/admin/attendance");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export interface AttendanceSummary {
  total_sessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number | null;
}

// The source of truth for "attendance %" everywhere it's shown (parent
// dashboard, student overview, future terminal reports) — always computed
// from actual attendance rows against actual sessions, never a manually
// entered figure, per §18.
export async function getStudentAttendanceSummary(studentId: string): Promise<AttendanceSummary> {
  const supabase = await createClient();

  const { data } = await supabase.from("attendance").select("status").eq("student_id", studentId);

  const rows = (data as { status: AttendanceStatus }[]) ?? [];
  const total = rows.length;
  const present = rows.filter((r) => r.status === "PRESENT").length;
  const absent = rows.filter((r) => r.status === "ABSENT").length;
  const late = rows.filter((r) => r.status === "LATE").length;
  const excused = rows.filter((r) => r.status === "EXCUSED").length;

  return {
    total_sessions: total,
    present,
    absent,
    late,
    excused,
    percentage: total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : null,
  };
}

// Term-scoped version for the Terminal Report (§24) — same computed-not-
// entered principle, restricted to sessions falling within the term's date
// range.
export async function getStudentAttendanceSummaryForTerm(
  studentId: string,
  startDate: string,
  endDate: string
): Promise<AttendanceSummary> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("attendance")
    .select("status, class_sessions!inner(session_date)")
    .eq("student_id", studentId)
    .gte("class_sessions.session_date", startDate)
    .lte("class_sessions.session_date", endDate);

  const rows = (data as { status: AttendanceStatus }[]) ?? [];
  const total = rows.length;
  const present = rows.filter((r) => r.status === "PRESENT").length;
  const absent = rows.filter((r) => r.status === "ABSENT").length;
  const late = rows.filter((r) => r.status === "LATE").length;
  const excused = rows.filter((r) => r.status === "EXCUSED").length;

  return {
    total_sessions: total,
    present,
    absent,
    late,
    excused,
    percentage: total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : null,
  };
}

export interface MyAttendanceRow {
  id: string;
  session_date: string;
  subject_name: string;
  class_name: string;
  status: AttendanceStatus;
  remarks: string | null;
}

export async function listMyAttendanceRecords(): Promise<MyAttendanceRow[]> {
  const { supabase, studentId } = await requireStudent();

  const { data } = await supabase
    .from("attendance")
    .select(
      "id, status, remarks, class_sessions(session_date, class_subjects(classes(name), subjects(name)))"
    )
    .eq("student_id", studentId);

  type Nested = { name: string } | { name: string }[] | null;
  type CS = { classes: Nested; subjects: Nested } | { classes: Nested; subjects: Nested }[] | null;
  type Session = { session_date: string; class_subjects: CS } | { session_date: string; class_subjects: CS }[] | null;
  type Raw = {
    id: string;
    status: AttendanceStatus;
    remarks: string | null;
    class_sessions: Session;
  };

  return ((data as Raw[]) ?? [])
    .map((row) => {
      const session = one(row.class_sessions);
      const cs = one(session?.class_subjects ?? null);
      return {
        id: row.id,
        session_date: session?.session_date ?? "",
        subject_name: one(cs?.subjects ?? null)?.name ?? "—",
        class_name: one(cs?.classes ?? null)?.name ?? "—",
        status: row.status,
        remarks: row.remarks,
      };
    })
    .sort((a, b) => b.session_date.localeCompare(a.session_date));
}

export interface ClassAttendanceOverviewRow {
  class_name: string;
  total_records: number;
  percentage: number;
}

// Org-wide, all-time attendance rate per class — for the admin Reports
// page. Distinct from getStudentAttendanceSummary (per-student) and the
// Dashboard's "today only" figure.
export async function getAttendanceOverviewByClass(): Promise<ClassAttendanceOverviewRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("attendance")
    .select("status, class_sessions!inner(class_subjects!inner(classes!inner(name, organization_id)))")
    .eq("class_sessions.class_subjects.classes.organization_id", organizationId);

  type Nested = { name: string } | { name: string }[] | null;
  type CS = { classes: Nested } | { classes: Nested }[] | null;
  type Session = { class_subjects: CS } | { class_subjects: CS }[] | null;
  type Raw = { status: AttendanceStatus; class_sessions: Session };

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  const byClass = new Map<string, { present: number; total: number }>();
  ((data as Raw[]) ?? []).forEach((row) => {
    const session = one(row.class_sessions);
    const cs = one(session?.class_subjects ?? null);
    const className = one(cs?.classes ?? null)?.name ?? "—";
    const entry = byClass.get(className) ?? { present: 0, total: 0 };
    entry.total += 1;
    if (row.status === "PRESENT" || row.status === "LATE") entry.present += 1;
    byClass.set(className, entry);
  });

  return Array.from(byClass.entries())
    .map(([class_name, { present, total }]) => ({
      class_name,
      total_records: total,
      percentage: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.class_name.localeCompare(b.class_name));
}

export interface MyChildAttendanceRow extends MyAttendanceRow {
  child_name: string;
}

export async function listMyChildrenAttendanceRecords(): Promise<MyChildAttendanceRow[]> {
  const { supabase, parentId } = await requireParent();

  const { data: links } = await supabase
    .from("parent_students")
    .select("student_profiles(id, first_name, last_name)")
    .eq("parent_id", parentId);

  type S = { id: string; first_name: string; last_name: string };
  type LinkRaw = { student_profiles: S | S[] | null };
  const children = ((links as LinkRaw[]) ?? [])
    .map((l) => one(l.student_profiles))
    .filter((s): s is S => s !== null);

  if (children.length === 0) return [];

  const { data } = await supabase
    .from("attendance")
    .select(
      "id, status, remarks, student_id, class_sessions(session_date, class_subjects(classes(name), subjects(name)))"
    )
    .in(
      "student_id",
      children.map((c) => c.id)
    );

  type Nested = { name: string } | { name: string }[] | null;
  type CS = { classes: Nested; subjects: Nested } | { classes: Nested; subjects: Nested }[] | null;
  type Session = { session_date: string; class_subjects: CS } | { session_date: string; class_subjects: CS }[] | null;
  type Raw = {
    id: string;
    status: AttendanceStatus;
    remarks: string | null;
    student_id: string;
    class_sessions: Session;
  };

  return ((data as Raw[]) ?? [])
    .map((row) => {
      const child = children.find((c) => c.id === row.student_id);
      const session = one(row.class_sessions);
      const cs = one(session?.class_subjects ?? null);
      return {
        id: row.id,
        child_name: child ? `${child.first_name} ${child.last_name}` : "—",
        session_date: session?.session_date ?? "",
        subject_name: one(cs?.subjects ?? null)?.name ?? "—",
        class_name: one(cs?.classes ?? null)?.name ?? "—",
        status: row.status,
        remarks: row.remarks,
      };
    })
    .sort((a, b) => b.session_date.localeCompare(a.session_date));
}

export interface SessionAttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export async function getSessionAttendanceStats(sessionId: string): Promise<SessionAttendanceStats> {
  const supabase = await staffClient();
  const { data } = await supabase.from("attendance").select("status").eq("session_id", sessionId);
  const rows = (data as { status: AttendanceStatus }[]) ?? [];
  return {
    total: rows.length,
    present: rows.filter((r) => r.status === "PRESENT").length,
    absent: rows.filter((r) => r.status === "ABSENT").length,
    late: rows.filter((r) => r.status === "LATE").length,
    excused: rows.filter((r) => r.status === "EXCUSED").length,
  };
}
