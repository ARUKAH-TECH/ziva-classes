"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { computeTerminalReport, type TerminalReportPayload } from "@/lib/reports/compute-report";
import { notifyParentsOfStudent } from "@/lib/notifications";

export type ReportStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface TerminalReportSummary {
  id: string;
  student_id: string;
  student_name: string;
  term_id: string;
  version: number;
  status: ReportStatus;
  overall_average: number | null;
  overall_grade: string | null;
  generated_at: string;
  published_at: string | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

// Students in a class for a given academic year, with their current
// (highest-version, non-archived) terminal report status for a term —
// powers the admin bulk-generate view.
export async function listReportsForClass(classId: string, termId: string): Promise<TerminalReportSummary[]> {
  const { supabase } = await requireAdmin();

  const { data: term } = await supabase.from("terms").select("academic_year_id").eq("id", termId).single();
  const academicYearId = (term as { academic_year_id: string } | null)?.academic_year_id;
  if (!academicYearId) return [];

  const { data: enrollments } = await supabase
    .from("student_enrollments")
    .select("student_id, student_profiles(first_name, last_name)")
    .eq("class_id", classId)
    .eq("academic_year_id", academicYearId)
    .eq("status", "ACTIVE");

  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type EnrollRaw = { student_id: string; student_profiles: U };
  const students = (enrollments as EnrollRaw[]) ?? [];
  if (students.length === 0) return [];

  const studentIds = students.map((s) => s.student_id);

  const { data: reports } = await supabase
    .from("terminal_reports")
    .select("id, student_id, version, status, overall_average, overall_grade, generated_at, published_at")
    .eq("term_id", termId)
    .in("student_id", studentIds)
    .neq("status", "ARCHIVED");

  type ReportRaw = {
    id: string;
    student_id: string;
    version: number;
    status: ReportStatus;
    overall_average: number | null;
    overall_grade: string | null;
    generated_at: string;
    published_at: string | null;
  };
  const reportByStudent = new Map<string, ReportRaw>();
  ((reports as ReportRaw[]) ?? []).forEach((r) => {
    const existing = reportByStudent.get(r.student_id);
    if (!existing || r.version > existing.version) reportByStudent.set(r.student_id, r);
  });

  return students.map((s) => {
    const u = one(s.student_profiles);
    const name = u ? `${u.first_name} ${u.last_name}` : "—";
    const r = reportByStudent.get(s.student_id);
    return {
      id: r?.id ?? "",
      student_id: s.student_id,
      student_name: name,
      term_id: termId,
      version: r?.version ?? 0,
      status: r?.status ?? ("DRAFT" as ReportStatus),
      overall_average: r?.overall_average ?? null,
      overall_grade: r?.overall_grade ?? null,
      generated_at: r?.generated_at ?? "",
      published_at: r?.published_at ?? null,
    };
  });
}

async function writeReportSubjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reportId: string,
  payload: TerminalReportPayload
) {
  await supabase.from("terminal_report_subjects").delete().eq("terminal_report_id", reportId);

  if (payload.subjects.length === 0) return;

  const { data: subjectRows } = await supabase.from("subjects").select("id, name");
  const subjectIdByName = new Map<string, string>();
  ((subjectRows as { id: string; name: string }[]) ?? []).forEach((s) => subjectIdByName.set(s.name, s.id));

  const rows = payload.subjects
    .map((s) => {
      const subjectId = subjectIdByName.get(s.subject_name);
      if (!subjectId) return null;
      return {
        terminal_report_id: reportId,
        subject_id: subjectId,
        average_score: s.subject_average_percentage,
        grade: s.subject_grade,
        teacher_comment: s.teacher_comment,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length > 0) {
    await supabase.from("terminal_report_subjects").insert(rows);
  }
}

// Generates or refreshes a DRAFT for (student, term). If a PUBLISHED report
// already exists for this term, the published row is left untouched
// (§30 — never silently change an issued report) and a new higher-version
// DRAFT is created instead, so the admin can review before re-publishing.
export async function generateReport(
  studentId: string,
  termId: string,
  rankingEnabled: boolean
): Promise<ActionResult<{ reportId: string }>> {
  try {
    const { supabase } = await requireAdmin();

    const payload = await computeTerminalReport(studentId, termId, { rankingEnabled });
    if (!payload) return { success: false, error: "Could not compute report — check student and term." };

    const { data: existing } = await supabase
      .from("terminal_reports")
      .select("id, version, status")
      .eq("student_id", studentId)
      .eq("term_id", termId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const existingRow = existing as { id: string; version: number; status: ReportStatus } | null;

    const commonFields = {
      overall_average: payload.overall_average,
      overall_grade: payload.overall_grade,
      position: payload.position,
      ranking_enabled: payload.ranking_enabled,
      fee_status: payload.fee_status,
      sessions_expected: payload.attendance.total_sessions,
      sessions_present: payload.attendance.present,
      sessions_absent: payload.attendance.absent,
      sessions_late: payload.attendance.late,
      sessions_excused: payload.attendance.excused,
      attendance_percentage: payload.attendance.percentage,
    };

    let reportId: string;

    if (!existingRow || existingRow.status === "ARCHIVED") {
      const nextVersion = existingRow ? existingRow.version + 1 : 1;
      const { data: inserted, error } = await supabase
        .from("terminal_reports")
        .insert({
          student_id: studentId,
          academic_year_id: payload.academic_year_id,
          term_id: termId,
          version: nextVersion,
          status: "DRAFT",
          ...commonFields,
        })
        .select("id")
        .single();
      if (error || !inserted) return { success: false, error: error?.message ?? "Could not create report." };
      reportId = (inserted as { id: string }).id;
    } else if (existingRow.status === "DRAFT") {
      const { error } = await supabase.from("terminal_reports").update(commonFields).eq("id", existingRow.id);
      if (error) return { success: false, error: error.message };
      reportId = existingRow.id;
    } else {
      // PUBLISHED — leave it alone, create a new draft version instead.
      const { data: inserted, error } = await supabase
        .from("terminal_reports")
        .insert({
          student_id: studentId,
          academic_year_id: payload.academic_year_id,
          term_id: termId,
          version: existingRow.version + 1,
          status: "DRAFT",
          ...commonFields,
        })
        .select("id")
        .single();
      if (error || !inserted) return { success: false, error: error?.message ?? "Could not create report." };
      reportId = (inserted as { id: string }).id;
    }

    await writeReportSubjects(supabase, reportId, payload);

    revalidatePath("/admin/terminal-reports");
    return { success: true, data: { reportId } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function generateReportsForClass(
  classId: string,
  termId: string,
  rankingEnabled: boolean
): Promise<ActionResult<{ generated: number }>> {
  try {
    const { supabase } = await requireAdmin();

    const { data: term } = await supabase.from("terms").select("academic_year_id").eq("id", termId).single();
    const academicYearId = (term as { academic_year_id: string } | null)?.academic_year_id;
    if (!academicYearId) return { success: false, error: "Term not found." };

    const { data: enrollments } = await supabase
      .from("student_enrollments")
      .select("student_id")
      .eq("class_id", classId)
      .eq("academic_year_id", academicYearId)
      .eq("status", "ACTIVE");

    const studentIds = ((enrollments as { student_id: string }[]) ?? []).map((e) => e.student_id);
    let count = 0;
    for (const studentId of studentIds) {
      const result = await generateReport(studentId, termId, rankingEnabled);
      if (result.success) count++;
    }

    revalidatePath("/admin/terminal-reports");
    return { success: true, data: { generated: count } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function publishReport(reportId: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAdmin();

    const { data: report } = await supabase
      .from("terminal_reports")
      .select("student_id, term_id, version, status, ranking_enabled")
      .eq("id", reportId)
      .single();

    if (!report) return { success: false, error: "Report not found." };
    const r = report as {
      student_id: string;
      term_id: string;
      version: number;
      status: ReportStatus;
      ranking_enabled: boolean;
    };

    if (r.status !== "DRAFT") {
      return { success: false, error: "Only a draft report can be published." };
    }

    const payload = await computeTerminalReport(r.student_id, r.term_id, { rankingEnabled: r.ranking_enabled });
    if (!payload) return { success: false, error: "Could not compute report." };

    await writeReportSubjects(supabase, reportId, payload);

    const { error } = await supabase
      .from("terminal_reports")
      .update({
        status: "PUBLISHED",
        published_by: userId,
        published_at: new Date().toISOString(),
        snapshot_data: payload,
        overall_average: payload.overall_average,
        overall_grade: payload.overall_grade,
        sessions_expected: payload.attendance.total_sessions,
        sessions_present: payload.attendance.present,
        sessions_absent: payload.attendance.absent,
        sessions_late: payload.attendance.late,
        sessions_excused: payload.attendance.excused,
        attendance_percentage: payload.attendance.percentage,
        fee_status: payload.fee_status,
      })
      .eq("id", reportId);

    if (error) return { success: false, error: error.message };

    // Archive any older published version for the same student+term.
    await supabase
      .from("terminal_reports")
      .update({ status: "ARCHIVED" })
      .eq("student_id", r.student_id)
      .eq("term_id", r.term_id)
      .lt("version", r.version)
      .eq("status", "PUBLISHED");

    await notifyParentsOfStudent(
      r.student_id,
      "Terminal report available",
      `The ${payload.term_name} terminal report is now available.`,
      "TERMINAL_REPORT_PUBLISHED"
    );

    revalidatePath("/admin/terminal-reports");
    revalidatePath("/parent/terminal-reports");
    revalidatePath("/student/terminal-reports");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function unpublishReport(reportId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("terminal_reports").update({ status: "DRAFT" }).eq("id", reportId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/terminal-reports");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateReportComments(
  reportId: string,
  input: { administrator_comment: string; teacher_comment: string }
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { data: existing } = await supabase.from("terminal_reports").select("status").eq("id", reportId).single();
    if ((existing as { status: ReportStatus } | null)?.status !== "DRAFT") {
      return {
        success: false,
        error: "This report is published — unpublish it first if you need to change its comments.",
      };
    }

    const { error } = await supabase
      .from("terminal_reports")
      .update({
        administrator_comment: input.administrator_comment || null,
        teacher_comment: input.teacher_comment || null,
      })
      .eq("id", reportId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/terminal-reports");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export interface FullReport {
  id: string;
  status: ReportStatus;
  version: number;
  administrator_comment: string | null;
  teacher_comment: string | null;
  generated_at: string;
  published_at: string | null;
  payload: TerminalReportPayload;
}

// Draft/in-progress reports render from live data (recomputed); published
// reports render from the frozen snapshot only, per §30.
export async function getFullReport(reportId: string): Promise<FullReport | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("terminal_reports")
    .select(
      "id, status, version, student_id, term_id, administrator_comment, teacher_comment, generated_at, published_at, snapshot_data, ranking_enabled"
    )
    .eq("id", reportId)
    .single();

  if (!data) return null;
  const r = data as {
    id: string;
    status: ReportStatus;
    ranking_enabled: boolean;
    version: number;
    student_id: string;
    term_id: string;
    administrator_comment: string | null;
    teacher_comment: string | null;
    generated_at: string;
    published_at: string | null;
    snapshot_data: TerminalReportPayload | null;
  };

  const payload =
    r.status === "PUBLISHED" && r.snapshot_data
      ? r.snapshot_data
      : await computeTerminalReport(r.student_id, r.term_id, { rankingEnabled: r.ranking_enabled });

  if (!payload) return null;

  return {
    id: r.id,
    status: r.status,
    version: r.version,
    administrator_comment: r.administrator_comment,
    teacher_comment: r.teacher_comment,
    generated_at: r.generated_at,
    published_at: r.published_at,
    payload,
  };
}

export interface MyReportRow {
  id: string;
  student_id: string;
  student_name: string;
  term_name: string;
  academic_year_name: string;
  published_at: string | null;
  overall_average: number | null;
  overall_grade: string | null;
}

// Parent/student "my published reports" list — relies entirely on RLS
// (terminal_reports_parent_view / terminal_reports_student_view), which
// already restricts status='PUBLISHED' and the caller's own child/self.
export async function listMyPublishedReports(): Promise<MyReportRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("terminal_reports")
    .select(
      "id, student_id, overall_average, overall_grade, published_at, terms(name), academic_years(name), student_profiles(first_name, last_name)"
    )
    .eq("status", "PUBLISHED")
    .order("published_at", { ascending: false });

  type Nested = { name: string } | { name: string }[] | null;
  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type Raw = {
    id: string;
    student_id: string;
    overall_average: number | null;
    overall_grade: string | null;
    published_at: string | null;
    terms: Nested;
    academic_years: Nested;
    student_profiles: U;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const u = one(row.student_profiles);
    return {
      id: row.id,
      student_id: row.student_id,
      student_name: u ? `${u.first_name} ${u.last_name}` : "—",
      term_name: one(row.terms)?.name ?? "—",
      academic_year_name: one(row.academic_years)?.name ?? "—",
      published_at: row.published_at,
      overall_average: row.overall_average,
      overall_grade: row.overall_grade,
    };
  });
}
