"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { createClient } from "@/lib/supabase/server";

export type AssessmentType = "ASSIGNMENT" | "QUIZ" | "TEST" | "EXAMINATION" | "PROJECT";

export interface AssessmentRow {
  id: string;
  class_subject_id: string;
  class_name: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
  term_id: string;
  term_name: string;
  name: string;
  assessment_type: AssessmentType;
  assessment_date: string | null;
  maximum_score: number;
  score_count: number;
  average_percentage: number | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

const ASSESSMENT_SELECT =
  "id, class_subject_id, teacher_id, term_id, name, assessment_type, assessment_date, maximum_score, class_subjects(classes(name), subjects(name)), teacher_profiles(users(first_name, last_name)), terms(name), scores(score)";

function mapAssessmentRows(data: unknown[]): AssessmentRow[] {
  type Nested = { name: string } | { name: string }[] | null;
  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type Raw = {
    id: string;
    class_subject_id: string;
    teacher_id: string;
    term_id: string;
    name: string;
    assessment_type: AssessmentType;
    assessment_date: string | null;
    maximum_score: number;
    class_subjects: { classes: Nested; subjects: Nested } | { classes: Nested; subjects: Nested }[] | null;
    teacher_profiles: { users: U } | { users: U }[] | null;
    terms: Nested;
    scores: { score: number }[] | null;
  };

  return (data as Raw[]).map((row) => {
    const cs = one(row.class_subjects);
    const teacher = one(one(row.teacher_profiles)?.users ?? null);
    const scores = row.scores ?? [];
    const avgPct =
      scores.length > 0 && row.maximum_score > 0
        ? Math.round((scores.reduce((sum, s) => sum + s.score, 0) / scores.length / row.maximum_score) * 1000) / 10
        : null;

    return {
      id: row.id,
      class_subject_id: row.class_subject_id,
      class_name: one(cs?.classes ?? null)?.name ?? "—",
      subject_name: one(cs?.subjects ?? null)?.name ?? "—",
      teacher_id: row.teacher_id,
      teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : "—",
      term_id: row.term_id,
      term_name: one(row.terms)?.name ?? "—",
      name: row.name,
      assessment_type: row.assessment_type,
      assessment_date: row.assessment_date,
      maximum_score: row.maximum_score,
      score_count: scores.length,
      average_percentage: avgPct,
    };
  });
}

// Works for admin (org-wide) and teacher (own only) — RLS decides which
// rows come back; this just needs a signed-in session.
export async function listAssessments(): Promise<AssessmentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("assessments").select(ASSESSMENT_SELECT);
  return mapAssessmentRows(data ?? []);
}

export async function createAssessmentAsTeacher(input: {
  class_subject_id: string;
  term_id: string;
  name: string;
  assessment_type: AssessmentType;
  assessment_date: string;
  maximum_score: number;
}): Promise<ActionResult> {
  try {
    const { supabase, teacherId } = await requireTeacher();

    if (!input.class_subject_id || !input.term_id || !input.name || input.maximum_score <= 0) {
      return { success: false, error: "Subject, term, name, and a positive maximum score are required." };
    }

    const { error } = await supabase.from("assessments").insert({
      class_subject_id: input.class_subject_id,
      term_id: input.term_id,
      teacher_id: teacherId,
      name: input.name,
      assessment_type: input.assessment_type,
      assessment_date: input.assessment_date || null,
      maximum_score: input.maximum_score,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/teacher/assessments");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function createAssessmentAsAdmin(input: {
  class_subject_id: string;
  teacher_id: string;
  term_id: string;
  name: string;
  assessment_type: AssessmentType;
  assessment_date: string;
  maximum_score: number;
}): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    if (!input.class_subject_id || !input.teacher_id || !input.term_id || !input.name || input.maximum_score <= 0) {
      return { success: false, error: "Class/subject, teacher, term, name, and a positive maximum score are required." };
    }

    const { error } = await supabase.from("assessments").insert({
      class_subject_id: input.class_subject_id,
      teacher_id: input.teacher_id,
      term_id: input.term_id,
      name: input.name,
      assessment_type: input.assessment_type,
      assessment_date: input.assessment_date || null,
      maximum_score: input.maximum_score,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/assessments");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteAssessment(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "You must be signed in." };

    const { error } = await supabase.from("assessments").delete().eq("id", id);
    if (error) {
      return {
        success: false,
        error: error.code === "23503" ? "Scores have already been entered for this assessment." : error.message,
      };
    }
    revalidatePath("/teacher/assessments");
    revalidatePath("/admin/assessments");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// Standard assessment layout every class/subject gets, term by term: four
// class-work categories worth 15% each (60% total) plus the exam worth
// 100% — the same 60/100 split the terminal report scales down to 50/50
// (see computeSubjectAverages in compute-report.ts). Teachers don't create
// these by hand; ensureStandardAssessments provisions them automatically so
// there's just a mark to fill in per student.
const STANDARD_ASSESSMENTS: { name: string; assessment_type: AssessmentType; maximum_score: number }[] = [
  { name: "Class Exercise", assessment_type: "TEST", maximum_score: 15 },
  { name: "Homework", assessment_type: "ASSIGNMENT", maximum_score: 15 },
  { name: "Quiz", assessment_type: "QUIZ", maximum_score: 15 },
  { name: "Project Work", assessment_type: "PROJECT", maximum_score: 15 },
  { name: "Exams", assessment_type: "EXAMINATION", maximum_score: 100 },
];

// Provisions the standard assessment layout for every class/subject this
// teacher is actively assigned to, for the given term. Idempotent — skips
// any (class_subject, type) pair that already has an assessment for this
// term, whether that came from a prior call or a manually-created one.
export async function ensureStandardAssessments(termId: string): Promise<ActionResult> {
  try {
    const { supabase, teacherId } = await requireTeacher();
    if (!termId) return { success: true, data: undefined };

    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select("class_subject_id")
      .eq("teacher_id", teacherId)
      .eq("active", true);

    const classSubjectIds = [
      ...new Set(((assignments as { class_subject_id: string }[]) ?? []).map((a) => a.class_subject_id)),
    ];
    if (classSubjectIds.length === 0) return { success: true, data: undefined };

    const { data: existing } = await supabase
      .from("assessments")
      .select("class_subject_id, assessment_type")
      .eq("term_id", termId)
      .in("class_subject_id", classSubjectIds);

    const existingKeys = new Set(
      ((existing as { class_subject_id: string; assessment_type: AssessmentType }[]) ?? []).map(
        (e) => `${e.class_subject_id}:${e.assessment_type}`
      )
    );

    const rows = classSubjectIds.flatMap((classSubjectId) =>
      STANDARD_ASSESSMENTS.filter((std) => !existingKeys.has(`${classSubjectId}:${std.assessment_type}`)).map(
        (std) => ({
          class_subject_id: classSubjectId,
          term_id: termId,
          teacher_id: teacherId,
          name: std.name,
          assessment_type: std.assessment_type,
          assessment_date: null,
          maximum_score: std.maximum_score,
        })
      )
    );

    if (rows.length > 0) {
      const { error } = await supabase.from("assessments").insert(rows);
      if (error) return { success: false, error: error.message };
      revalidatePath("/teacher/assessments");
    }

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// My (teacher's) own class+subject assignments, for the create-assessment picker.
export interface MyClassSubjectOption {
  class_subject_id: string;
  class_name: string;
  subject_name: string;
  academic_level_id: string;
}

export async function listMyClassSubjects(): Promise<MyClassSubjectOption[]> {
  const { supabase, teacherId } = await requireTeacher();

  const { data } = await supabase
    .from("teacher_assignments")
    .select("class_subject_id, active, class_subjects(classes(name, academic_level_id), subjects(name))")
    .eq("teacher_id", teacherId)
    .eq("active", true);

  type Nested = { name: string } | { name: string }[] | null;
  type ClassNested = { name: string; academic_level_id: string } | { name: string; academic_level_id: string }[] | null;
  type Raw = {
    class_subject_id: string;
    class_subjects: { classes: ClassNested; subjects: Nested } | { classes: ClassNested; subjects: Nested }[] | null;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const cs = one(row.class_subjects);
    const cls = one(cs?.classes ?? null);
    return {
      class_subject_id: row.class_subject_id,
      class_name: cls?.name ?? "—",
      subject_name: one(cs?.subjects ?? null)?.name ?? "—",
      academic_level_id: cls?.academic_level_id ?? "",
    };
  });
}
