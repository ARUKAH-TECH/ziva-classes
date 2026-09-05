"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { createClient } from "@/lib/supabase/server";

export type LibraryReviewStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

// A lightweight row for list views (admin review queue, teacher dropdown).
export interface LibraryListRow {
  id: string;
  term_number: number;
  academic_level_raw: string;
  academic_level_name: string | null;
  subject_raw: string;
  subject_name: string | null;
  week_number: number | null;
  topic: string | null;
  extraction_method: string;
  review_status: LibraryReviewStatus;
  source_file_path: string;
}

// Full GES field set — what a teacher's lesson-note form auto-fills from.
export interface LibraryEntryDetail {
  id: string;
  term_number: number;
  academic_level_id: string | null;
  academic_level_raw: string;
  subject_id: string | null;
  subject_raw: string;
  week_number: number | null;
  week_ending: string | null;
  topic: string | null;
  strand: string | null;
  sub_strand: string | null;
  indicator: string | null;
  content_standard: string | null;
  performance_indicator: string | null;
  core_competencies: string | null;
  keywords: string | null;
  teaching_learning_resources: string | null;
  reference: string | null;
  phase1_starter: string | null;
  phase2_main: string | null;
  phase3_reflection: string | null;
  remarks: string | null;
  storage_path: string | null;
  review_status: LibraryReviewStatus;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

const LIST_SELECT =
  "id, term_number, academic_level_raw, subject_raw, week_number, topic, extraction_method, review_status, source_file_path, academic_levels(name), subjects(name)";

type NameNested = { name: string } | { name: string }[] | null;
type ListRaw = {
  id: string;
  term_number: number;
  academic_level_raw: string;
  subject_raw: string;
  week_number: number | null;
  topic: string | null;
  extraction_method: string;
  review_status: LibraryReviewStatus;
  source_file_path: string;
  academic_levels: NameNested;
  subjects: NameNested;
};

function mapListRow(row: ListRaw): LibraryListRow {
  return {
    id: row.id,
    term_number: row.term_number,
    academic_level_raw: row.academic_level_raw,
    academic_level_name: one(row.academic_levels)?.name ?? null,
    subject_raw: row.subject_raw,
    subject_name: one(row.subjects)?.name ?? null,
    week_number: row.week_number,
    topic: row.topic,
    extraction_method: row.extraction_method,
    review_status: row.review_status,
    source_file_path: row.source_file_path,
  };
}

// Admin review queue — every entry in the org, newest-imported first isn't
// tracked (no created_at ordering guarantee needed); ordered for scanning.
export async function listLibraryEntries(filters?: {
  review_status?: LibraryReviewStatus;
}): Promise<LibraryListRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  let query = supabase
    .from("lesson_plan_library")
    .select(LIST_SELECT)
    .eq("organization_id", organizationId)
    .order("academic_level_raw", { ascending: true })
    .order("subject_raw", { ascending: true })
    .order("week_number", { ascending: true });

  if (filters?.review_status) query = query.eq("review_status", filters.review_status);

  const { data } = await query;
  return ((data as unknown as ListRaw[]) ?? []).map(mapListRow);
}

export async function getLibraryEntry(id: string): Promise<LibraryEntryDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lesson_plan_library")
    .select(
      "id, term_number, academic_level_id, academic_level_raw, subject_id, subject_raw, week_number, week_ending, topic, strand, sub_strand, indicator, content_standard, performance_indicator, core_competencies, keywords, teaching_learning_resources, reference, phase1_starter, phase2_main, phase3_reflection, remarks, storage_path, review_status"
    )
    .eq("id", id)
    .single();
  return (data as LibraryEntryDetail) ?? null;
}

export async function updateLibraryEntry(
  id: string,
  patch: Partial<
    Pick<
      LibraryEntryDetail,
      | "academic_level_raw"
      | "subject_raw"
      | "week_number"
      | "topic"
      | "strand"
      | "sub_strand"
      | "indicator"
      | "content_standard"
      | "performance_indicator"
      | "core_competencies"
      | "keywords"
      | "teaching_learning_resources"
      | "reference"
      | "phase1_starter"
      | "phase2_main"
      | "phase3_reflection"
      | "remarks"
    >
  > & { academic_level_id?: string | null; subject_id?: string | null }
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("lesson_plan_library")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/lesson-plan-library");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function reviewLibraryEntry(id: string, status: LibraryReviewStatus): Promise<ActionResult> {
  try {
    const { supabase, organizationId, userId } = await requireAdmin();

    const { error } = await supabase
      .from("lesson_plan_library")
      .update({ review_status: status, reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/lesson-plan-library");
    revalidatePath("/teacher/lesson-notes");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// One click approves every still-pending entry in a whole term — every
// subject and class at once — instead of an admin working through entries
// one at a time. Only touches rows still PENDING_REVIEW, so it never
// reopens something an admin already rejected.
export async function approveAllPendingInTerm(termNumber: number): Promise<ActionResult<{ approved: number }>> {
  try {
    const { supabase, organizationId, userId } = await requireAdmin();

    const { data, error } = await supabase
      .from("lesson_plan_library")
      .update({ review_status: "APPROVED", reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("term_number", termNumber)
      .eq("review_status", "PENDING_REVIEW")
      .select("id");

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/lesson-plan-library");
    revalidatePath("/teacher/lesson-notes");
    return { success: true, data: { approved: data?.length ?? 0 } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// Resolves a short-lived signed URL for the original source document.
// Uses the caller's own session — storage RLS (004_lesson_plan_library_storage.sql)
// decides whether they're actually allowed to see this particular file.
export async function getLibrarySourceUrl(storagePath: string | null): Promise<string | null> {
  if (!storagePath) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("lesson-plan-library").createSignedUrl(storagePath, 60 * 15);
  if (error || !data) return null;
  return data.signedUrl;
}

// Extracts the leading digit from a term's name ("Term 1" -> 1). Falls
// back to null when the name carries no digit — callers should then show
// every term's entries rather than none, since we can't tell them apart.
function termNumberFromName(name: string): number | null {
  const m = name.match(/\d/);
  return m ? parseInt(m[0], 10) : null;
}

// Teacher-facing: approved library entries matching the class/subject and
// term the teacher is currently filling in a lesson note for.
export async function listLibraryOptionsForClassSubject(
  classSubjectId: string,
  termId: string
): Promise<LibraryListRow[]> {
  const { supabase, organizationId } = await requireTeacher();

  const { data: csRow } = await supabase
    .from("class_subjects")
    .select("subject_id, classes(academic_level_id)")
    .eq("id", classSubjectId)
    .single();

  type ClassNested = { academic_level_id: string } | { academic_level_id: string }[] | null;
  const cs = csRow as { subject_id: string; classes: ClassNested } | null;
  const academicLevelId = one(cs?.classes ?? null)?.academic_level_id;
  const subjectId = cs?.subject_id;
  if (!academicLevelId || !subjectId) return [];

  const { data: termRow } = await supabase.from("terms").select("name").eq("id", termId).single();
  const termNumber = termNumberFromName((termRow as { name: string } | null)?.name ?? "");

  let query = supabase
    .from("lesson_plan_library")
    .select(LIST_SELECT)
    .eq("organization_id", organizationId)
    .eq("academic_level_id", academicLevelId)
    .eq("subject_id", subjectId)
    .eq("review_status", "APPROVED")
    .order("week_number", { ascending: true });

  if (termNumber) query = query.eq("term_number", termNumber);

  const { data } = await query;
  return ((data as unknown as ListRaw[]) ?? []).map(mapListRow);
}
