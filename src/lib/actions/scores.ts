"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { lookupGrade } from "@/lib/grading";
import { notifyParentsOfStudent } from "@/lib/notifications";

export interface ScoreRosterEntry {
  student_id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  score: number | null;
  grade: string | null;
  teacher_comment: string | null;
}

export interface AssessmentContext {
  id: string;
  name: string;
  class_name: string;
  subject_name: string;
  maximum_score: number;
  academic_level_id: string;
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

export async function getAssessmentContext(assessmentId: string): Promise<AssessmentContext | null> {
  const supabase = await staffClient();

  const { data } = await supabase
    .from("assessments")
    .select("id, name, maximum_score, class_subject_id, class_subjects(classes(name, academic_level_id), subjects(name))")
    .eq("id", assessmentId)
    .single();

  if (!data) return null;

  type Nested = { name: string } | { name: string }[] | null;
  type ClassNested = { name: string; academic_level_id: string } | { name: string; academic_level_id: string }[] | null;
  type Raw = {
    id: string;
    name: string;
    maximum_score: number;
    class_subjects: { classes: ClassNested; subjects: Nested } | { classes: ClassNested; subjects: Nested }[] | null;
  };
  const row = data as Raw;
  const cs = one(row.class_subjects);
  const cls = one(cs?.classes ?? null);

  return {
    id: row.id,
    name: row.name,
    class_name: cls?.name ?? "—",
    subject_name: one(cs?.subjects ?? null)?.name ?? "—",
    maximum_score: row.maximum_score,
    academic_level_id: cls?.academic_level_id ?? "",
  };
}

export async function getAssessmentRoster(assessmentId: string): Promise<ScoreRosterEntry[]> {
  const supabase = await staffClient();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("class_subject_id")
    .eq("id", assessmentId)
    .single();

  const classSubjectId = (assessment as { class_subject_id: string } | null)?.class_subject_id;
  if (!classSubjectId) return [];

  const { data: enrolled } = await supabase
    .from("student_subjects")
    .select("student_profiles(id, student_number, first_name, last_name, status)")
    .eq("class_subject_id", classSubjectId);

  type S = { id: string; student_number: string; first_name: string; last_name: string; status: string };
  type Raw = { student_profiles: S | S[] | null };

  const students = ((enrolled as Raw[]) ?? [])
    .map((r) => one(r.student_profiles))
    .filter((s): s is S => s !== null && s.status === "ACTIVE")
    .sort((a, b) => a.first_name.localeCompare(b.first_name));

  const { data: existingScores } = await supabase
    .from("scores")
    .select("student_id, score, grade, teacher_comment")
    .eq("assessment_id", assessmentId);

  type Sc = { student_id: string; score: number; grade: string | null; teacher_comment: string | null };
  const scoresByStudent = new Map<string, Sc>();
  ((existingScores as Sc[]) ?? []).forEach((s) => scoresByStudent.set(s.student_id, s));

  return students.map((s) => {
    const existing = scoresByStudent.get(s.id);
    return {
      student_id: s.id,
      student_number: s.student_number,
      first_name: s.first_name,
      last_name: s.last_name,
      score: existing?.score ?? null,
      grade: existing?.grade ?? null,
      teacher_comment: existing?.teacher_comment ?? null,
    };
  });
}

export async function saveScores(
  assessmentId: string,
  academicLevelId: string,
  maximumScore: number,
  records: { student_id: string; score: number; teacher_comment: string }[]
): Promise<ActionResult> {
  try {
    const supabase = await staffClient();

    const rows = await Promise.all(
      records.map(async (r) => {
        const percentage = maximumScore > 0 ? (r.score / maximumScore) * 100 : 0;
        const grade = academicLevelId ? await lookupGrade(supabase, academicLevelId, percentage) : null;
        return {
          assessment_id: assessmentId,
          student_id: r.student_id,
          score: r.score,
          grade: grade?.label ?? null,
          teacher_comment: r.teacher_comment || null,
        };
      })
    );

    const { error } = await supabase.from("scores").upsert(rows, { onConflict: "assessment_id,student_id" });
    if (error) return { success: false, error: error.message };

    const context = await getAssessmentContext(assessmentId);
    if (context) {
      await Promise.all(
        records.map((r) =>
          notifyParentsOfStudent(
            r.student_id,
            "New result uploaded",
            `${context.subject_name} — "${context.name}" result has been uploaded.`,
            "RESULT_UPLOADED"
          )
        )
      );
    }

    revalidatePath("/teacher/results");
    revalidatePath("/admin/results");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export interface StudentPerformanceSummary {
  overall_average: number | null;
  subject_averages: { subject_name: string; average_percentage: number; assessment_count: number }[];
}

// Source of truth for "academic average" everywhere it's shown — computed
// from actual scores, same principle as attendance in Phase 4.
export async function getStudentPerformanceSummary(studentId: string): Promise<StudentPerformanceSummary> {
  const supabase = await createClient();

  const { data: scored } = await supabase
    .from("scores")
    .select("score, assessments(maximum_score, class_subjects(subjects(name)))")
    .eq("student_id", studentId);

  type Nested = { name: string } | { name: string }[] | null;
  type CS = { subjects: Nested } | { subjects: Nested }[] | null;
  type Raw = {
    score: number;
    assessments: { maximum_score: number; class_subjects: CS } | { maximum_score: number; class_subjects: CS }[] | null;
  };

  const bySubject = new Map<string, number[]>();
  ((scored as Raw[]) ?? []).forEach((row) => {
    const a = one(row.assessments);
    if (!a || a.maximum_score <= 0) return;
    const subjectName = one(one(a.class_subjects)?.subjects ?? null)?.name ?? "—";
    const pct = (row.score / a.maximum_score) * 100;
    const list = bySubject.get(subjectName) ?? [];
    list.push(pct);
    bySubject.set(subjectName, list);
  });

  const subjectAverages = Array.from(bySubject.entries()).map(([subject_name, pcts]) => ({
    subject_name,
    average_percentage: Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10,
    assessment_count: pcts.length,
  }));

  const overall =
    subjectAverages.length > 0
      ? Math.round(
          (subjectAverages.reduce((sum, s) => sum + s.average_percentage, 0) / subjectAverages.length) * 10
        ) / 10
      : null;

  return { overall_average: overall, subject_averages: subjectAverages };
}
