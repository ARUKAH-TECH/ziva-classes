"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { createClient } from "@/lib/supabase/server";

export type LessonNoteStatus = "DRAFT" | "PENDING" | "VERIFIED" | "NOT_COMPLETE";

// Ghana Education Service standard weekly lesson plan fields.
export interface LessonNoteRow {
  id: string;
  teacher_id: string;
  teacher_name: string;
  class_subject_id: string;
  class_name: string;
  subject_name: string;
  term_id: string;
  term_name: string;
  week_number: number | null;
  week_ending: string | null;
  day_name: string | null;
  lesson_date: string | null;
  strand: string;
  sub_strand: string;
  indicator: string;
  content_standard: string;
  performance_indicator: string;
  core_competencies: string | null;
  keywords: string | null;
  teaching_learning_resources: string | null;
  reference: string | null;
  phase1_starter: string;
  phase2_main: string;
  phase3_reflection: string;
  remarks: string | null;
  status: LessonNoteStatus;
  admin_comment: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  submitted_at: string;
}

export interface LessonNoteInput {
  class_subject_id: string;
  term_id: string;
  week_number: string;
  week_ending: string;
  day_name: string;
  lesson_date: string;
  strand: string;
  sub_strand: string;
  indicator: string;
  content_standard: string;
  performance_indicator: string;
  core_competencies: string;
  keywords: string;
  teaching_learning_resources: string;
  reference: string;
  phase1_starter: string;
  phase2_main: string;
  phase3_reflection: string;
  remarks: string;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

const LESSON_NOTE_SELECT =
  "id, teacher_id, class_subject_id, term_id, week_number, week_ending, day_name, lesson_date, strand, sub_strand, indicator, content_standard, performance_indicator, core_competencies, keywords, teaching_learning_resources, reference, phase1_starter, phase2_main, phase3_reflection, remarks, status, admin_comment, reviewed_at, submitted_at, teacher_profiles(users(first_name, last_name)), class_subjects(classes(name), subjects(name)), terms(name), reviewer:users!lesson_notes_reviewed_by_fkey(first_name, last_name)";

type Nested = { name: string } | { name: string }[] | null;
type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
type Raw = {
  id: string;
  teacher_id: string;
  class_subject_id: string;
  term_id: string;
  week_number: number | null;
  week_ending: string | null;
  day_name: string | null;
  lesson_date: string | null;
  strand: string;
  sub_strand: string;
  indicator: string;
  content_standard: string;
  performance_indicator: string;
  core_competencies: string | null;
  keywords: string | null;
  teaching_learning_resources: string | null;
  reference: string | null;
  phase1_starter: string;
  phase2_main: string;
  phase3_reflection: string;
  remarks: string | null;
  status: LessonNoteStatus;
  admin_comment: string | null;
  reviewed_at: string | null;
  submitted_at: string;
  teacher_profiles: { users: U } | { users: U }[] | null;
  class_subjects: { classes: Nested; subjects: Nested } | { classes: Nested; subjects: Nested }[] | null;
  terms: Nested;
  reviewer: U;
};

function mapLessonNoteRow(row: Raw): LessonNoteRow {
  const cs = one(row.class_subjects);
  const teacher = one(one(row.teacher_profiles)?.users ?? null);
  const reviewer = one(row.reviewer);
  return {
    id: row.id,
    teacher_id: row.teacher_id,
    teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : "—",
    class_subject_id: row.class_subject_id,
    class_name: one(cs?.classes ?? null)?.name ?? "—",
    subject_name: one(cs?.subjects ?? null)?.name ?? "—",
    term_id: row.term_id,
    term_name: one(row.terms)?.name ?? "—",
    week_number: row.week_number,
    week_ending: row.week_ending,
    day_name: row.day_name,
    lesson_date: row.lesson_date,
    strand: row.strand,
    sub_strand: row.sub_strand,
    indicator: row.indicator,
    content_standard: row.content_standard,
    performance_indicator: row.performance_indicator,
    core_competencies: row.core_competencies,
    keywords: row.keywords,
    teaching_learning_resources: row.teaching_learning_resources,
    reference: row.reference,
    phase1_starter: row.phase1_starter,
    phase2_main: row.phase2_main,
    phase3_reflection: row.phase3_reflection,
    remarks: row.remarks,
    status: row.status,
    admin_comment: row.admin_comment,
    reviewed_by_name: reviewer ? `${reviewer.first_name} ${reviewer.last_name}` : null,
    reviewed_at: row.reviewed_at,
    submitted_at: row.submitted_at,
  };
}

export async function listMyLessonNotes(): Promise<LessonNoteRow[]> {
  const { supabase, teacherId } = await requireTeacher();

  const { data } = await supabase
    .from("lesson_notes")
    .select(LESSON_NOTE_SELECT)
    .eq("teacher_id", teacherId)
    .order("submitted_at", { ascending: false });

  return ((data as unknown as Raw[]) ?? []).map(mapLessonNoteRow);
}

// Every lesson note in the org, newest first — this is how they "reflect in
// the Super Admin's portal" for printing/correcting/verifying. Excludes
// DRAFT rows — those are still in progress and haven't been submitted yet.
export async function listAllLessonNotes(): Promise<LessonNoteRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("lesson_notes")
    .select(LESSON_NOTE_SELECT)
    .eq("organization_id", organizationId)
    .neq("status", "DRAFT")
    .order("submitted_at", { ascending: false });

  return ((data as unknown as Raw[]) ?? []).map(mapLessonNoteRow);
}

// Shared detail/print fetch — RLS decides whether the caller (the owning
// teacher, or any admin) can actually see this row.
export async function getLessonNote(id: string): Promise<LessonNoteRow | null> {
  const supabase = await createClient();

  const { data } = await supabase.from("lesson_notes").select(LESSON_NOTE_SELECT).eq("id", id).single();

  return data ? mapLessonNoteRow(data as unknown as Raw) : null;
}

// A draft only needs enough to identify what it's for — everything else can
// be filled in later, across as many "save and come back" sessions as the
// teacher wants.
function validateDraft(input: LessonNoteInput): string | null {
  if (!input.class_subject_id || !input.term_id) return "Class/subject and term are required, even for a draft.";
  return null;
}

function validateForSubmit(input: LessonNoteInput): string | null {
  if (!input.class_subject_id || !input.term_id) return "Class/subject and term are required.";
  if (!input.strand || !input.sub_strand || !input.indicator) {
    return "Strand, sub-strand, and indicator are required.";
  }
  if (!input.content_standard || !input.performance_indicator) {
    return "Content standard and performance indicator are required.";
  }
  if (!input.phase1_starter || !input.phase2_main || !input.phase3_reflection) {
    return "All three lesson phases (Starter, Main Lesson, Reflection) are required.";
  }
  return null;
}

function toInsertRow(input: LessonNoteInput) {
  return {
    class_subject_id: input.class_subject_id,
    term_id: input.term_id,
    week_number: input.week_number ? parseInt(input.week_number, 10) : null,
    week_ending: input.week_ending || null,
    day_name: input.day_name || null,
    lesson_date: input.lesson_date || null,
    strand: input.strand,
    sub_strand: input.sub_strand,
    indicator: input.indicator,
    content_standard: input.content_standard,
    performance_indicator: input.performance_indicator,
    core_competencies: input.core_competencies || null,
    keywords: input.keywords || null,
    teaching_learning_resources: input.teaching_learning_resources || null,
    reference: input.reference || null,
    phase1_starter: input.phase1_starter,
    phase2_main: input.phase2_main,
    phase3_reflection: input.phase3_reflection,
    remarks: input.remarks || null,
  };
}

// draft=true saves progress privately (status stays/becomes DRAFT, minimal
// validation, invisible to admin). draft=false is a real submission (full
// GES validation, status becomes PENDING and shows up for admin review).
export async function submitLessonNote(input: LessonNoteInput, draft = false): Promise<ActionResult> {
  try {
    const { supabase, teacherId, organizationId } = await requireTeacher();

    const validationError = draft ? validateDraft(input) : validateForSubmit(input);
    if (validationError) return { success: false, error: validationError };

    const { error } = await supabase.from("lesson_notes").insert({
      organization_id: organizationId,
      teacher_id: teacherId,
      status: draft ? "DRAFT" : "PENDING",
      ...toInsertRow(input),
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/teacher/lesson-notes");
    revalidatePath("/admin/lesson-notes");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// A teacher can edit their own note while it's DRAFT, PENDING, or
// NOT_COMPLETE. Once VERIFIED, an admin has signed off on it — editing is
// blocked until they mark it Not Complete again, same as unpublishing a
// terminal report before it can be changed. draft=true keeps saving it as a
// draft (for "exit and come back later"); draft=false submits it for real
// (PENDING) with full validation, whether it was previously a DRAFT or a
// NOT_COMPLETE resubmission.
export async function updateLessonNote(id: string, input: LessonNoteInput, draft = false): Promise<ActionResult> {
  try {
    const { supabase, teacherId } = await requireTeacher();

    const validationError = draft ? validateDraft(input) : validateForSubmit(input);
    if (validationError) return { success: false, error: validationError };

    const { data: existing } = await supabase
      .from("lesson_notes")
      .select("status")
      .eq("id", id)
      .eq("teacher_id", teacherId)
      .single();

    const status = (existing as { status: LessonNoteStatus } | null)?.status;
    if (!status) return { success: false, error: "Lesson note not found." };
    if (status === "VERIFIED") {
      return {
        success: false,
        error: "This lesson note has already been verified — ask an admin to reopen it before editing.",
      };
    }

    const { error } = await supabase
      .from("lesson_notes")
      .update({
        ...toInsertRow(input),
        status: draft ? "DRAFT" : "PENDING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("teacher_id", teacherId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/teacher/lesson-notes");
    revalidatePath("/admin/lesson-notes");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteLessonNote(id: string): Promise<ActionResult> {
  try {
    const { supabase, teacherId } = await requireTeacher();

    const { data: existing } = await supabase
      .from("lesson_notes")
      .select("status")
      .eq("id", id)
      .eq("teacher_id", teacherId)
      .single();

    const status = (existing as { status: LessonNoteStatus } | null)?.status;
    if (!status) return { success: false, error: "Lesson note not found." };
    if (status === "VERIFIED") {
      return { success: false, error: "This lesson note has already been verified and can't be deleted." };
    }

    const { error } = await supabase.from("lesson_notes").delete().eq("id", id).eq("teacher_id", teacherId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/teacher/lesson-notes");
    revalidatePath("/admin/lesson-notes");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// Admin review: mark Verified or Not Complete, with an optional correction
// comment. Ticking a status is exactly the "tick a space" the school asked
// for — implemented as two explicit choices rather than a single checkbox
// so "not reviewed yet" (PENDING) stays distinguishable from "reviewed and
// found incomplete."
export async function reviewLessonNote(
  id: string,
  input: { status: "VERIFIED" | "NOT_COMPLETE"; admin_comment: string }
): Promise<ActionResult> {
  try {
    const { supabase, organizationId, userId } = await requireAdmin();

    const { error } = await supabase
      .from("lesson_notes")
      .update({
        status: input.status,
        admin_comment: input.admin_comment || null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/lesson-notes");
    revalidatePath("/teacher/lesson-notes");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
