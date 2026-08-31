"use server";

// Super Admin bulk-import: turns rows pasted from a spreadsheet into the
// same records the one-at-a-time admin forms create. Every entity that
// touches a login account or money is created by calling the *existing*
// single-entry action (createTeacher, createParent, createStudent,
// linkParentToStudent, createFeeStructure/createMaterialsFeeStructure,
// createSchedule, createPayment) — that's where the real complexity already
// lives (Supabase Auth account creation, phone-as-password policy,
// sequential ID generation, rollback-on-failure, notifications, balance
// math), so this file only resolves pasted names to IDs and calls through.
// Simple lookup/link rows (classes, subjects, class_subjects,
// teacher_assignments) are direct find-or-create queries here since there's
// no auth/money complexity worth wrapping.

import { requireSuperAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { createTeacher } from "./teachers";
import { createParent } from "./parents";
import { createStudent } from "./students";
import { linkParentToStudent } from "./student-parents";
import { createFeeStructure, createMaterialsFeeStructure } from "./fee-structures";
import { createSchedule, listStudentsForClassSubject } from "./schedules";
import { createPayment, type PaymentMethod } from "./payments";
import type { SessionType } from "@/lib/constants";

type AdminSupabase = Awaited<ReturnType<typeof requireSuperAdmin>>["supabase"];

export interface BulkImportRowResult {
  row: number;
  status: "created" | "linked" | "skipped" | "error";
  message: string;
}

export interface BulkImportSummary {
  results: BulkImportRowResult[];
  created: number;
  skipped: number;
  errors: number;
}

async function runBatch<T>(
  rows: T[],
  handler: (row: T) => Promise<{ status: BulkImportRowResult["status"]; message: string }>
): Promise<BulkImportSummary> {
  const results: BulkImportRowResult[] = [];
  for (let i = 0; i < rows.length; i++) {
    try {
      const outcome = await handler(rows[i]);
      results.push({ row: i + 1, ...outcome });
    } catch (e) {
      results.push({ row: i + 1, status: "error", message: (e as Error).message });
    }
  }
  return {
    results,
    created: results.filter((r) => r.status === "created" || r.status === "linked").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
  };
}

function required(value: string | undefined, label: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  return trimmed;
}

// ============================================================
// Shared find-or-create helpers
// ============================================================

async function findOrCreateLevel(supabase: AdminSupabase, organizationId: string, name: string): Promise<string> {
  const trimmed = name.trim();
  const { data: existing } = await supabase
    .from("academic_levels")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data: created, error } = await supabase
    .from("academic_levels")
    .insert({ organization_id: organizationId, name: trimmed })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? `Could not create academic level "${trimmed}".`);
  return (created as { id: string }).id;
}

// Resolves a class by name (+ level, when given). Creates it only when a
// level is available — either passed in already resolved, or by name.
async function findOrCreateClass(
  supabase: AdminSupabase,
  organizationId: string,
  className: string,
  levelName: string | undefined
): Promise<string> {
  const trimmed = className.trim();
  const { data: existing } = await supabase
    .from("classes")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const level = (levelName ?? "").trim();
  if (!level) {
    throw new Error(`Class "${trimmed}" doesn't exist yet — add a Level so it can be created.`);
  }
  const levelId = await findOrCreateLevel(supabase, organizationId, level);

  const { data: created, error } = await supabase
    .from("classes")
    .insert({ organization_id: organizationId, academic_level_id: levelId, name: trimmed })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? `Could not create class "${trimmed}".`);
  return (created as { id: string }).id;
}

async function findClassId(supabase: AdminSupabase, organizationId: string, className: string): Promise<string | null> {
  const { data } = await supabase
    .from("classes")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("name", className.trim())
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

async function findOrCreateSubject(supabase: AdminSupabase, organizationId: string, name: string): Promise<string> {
  const trimmed = name.trim();
  const { data: existing } = await supabase
    .from("subjects")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data: created, error } = await supabase
    .from("subjects")
    .insert({ organization_id: organizationId, name: trimmed })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? `Could not create subject "${trimmed}".`);
  return (created as { id: string }).id;
}

async function findOrCreateClassSubject(supabase: AdminSupabase, classId: string, subjectId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("class_subjects")
    .select("id")
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data: created, error } = await supabase
    .from("class_subjects")
    .insert({ class_id: classId, subject_id: subjectId })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Could not link subject to class.");
  return (created as { id: string }).id;
}

async function findClassSubjectId(supabase: AdminSupabase, classId: string, subjectId: string): Promise<string | null> {
  const { data } = await supabase
    .from("class_subjects")
    .select("id")
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

async function getCurrentAcademicYearId(supabase: AdminSupabase, organizationId: string): Promise<string | null> {
  const { data } = await supabase
    .from("academic_years")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_current", true)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

async function getCurrentTermId(supabase: AdminSupabase, academicYearId: string | null): Promise<string | null> {
  if (!academicYearId) return null;
  const { data } = await supabase
    .from("terms")
    .select("id")
    .eq("academic_year_id", academicYearId)
    .eq("is_current", true)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

interface TeacherDirectoryEntry {
  id: string;
  employeeNumber: string | null;
  loginId: string | null;
  phone: string | null;
  fullName: string;
}

async function loadTeacherDirectory(supabase: AdminSupabase, organizationId: string): Promise<TeacherDirectoryEntry[]> {
  const { data } = await supabase
    .from("teacher_profiles")
    .select("id, employee_number, login_id, users(first_name, last_name, phone)")
    .eq("organization_id", organizationId);

  type U = { first_name: string; last_name: string; phone: string | null };
  type Raw = { id: string; employee_number: string | null; login_id: string | null; users: U | U[] | null };
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  return ((data as Raw[]) ?? []).map((row) => {
    const u = one(row.users);
    return {
      id: row.id,
      employeeNumber: row.employee_number,
      loginId: row.login_id,
      phone: u?.phone ?? null,
      fullName: u ? `${u.first_name} ${u.last_name}` : "",
    };
  });
}

function resolveTeacherId(directory: TeacherDirectoryEntry[], identifier: string): string | null {
  const trimmed = identifier.trim();
  if (!trimmed) return null;
  const norm = trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, "");
  const match = directory.find(
    (t) =>
      (t.employeeNumber && t.employeeNumber.toLowerCase() === norm) ||
      (t.loginId && t.loginId.toLowerCase() === norm) ||
      (digits.length >= 6 && t.phone && t.phone.replace(/\D/g, "") === digits) ||
      t.fullName.toLowerCase() === norm
  );
  return match?.id ?? null;
}

interface ParentDirectoryEntry {
  id: string;
  phone: string | null;
}

async function loadParentDirectory(supabase: AdminSupabase, organizationId: string): Promise<ParentDirectoryEntry[]> {
  const { data } = await supabase
    .from("parent_profiles")
    .select("id, users(phone)")
    .eq("organization_id", organizationId);

  type U = { phone: string | null };
  type Raw = { id: string; users: U | U[] | null };
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  return ((data as Raw[]) ?? []).map((row) => ({ id: row.id, phone: one(row.users)?.phone ?? null }));
}

function resolveParentId(directory: ParentDirectoryEntry[], phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return null;
  return directory.find((p) => p.phone && p.phone.replace(/\D/g, "") === digits)?.id ?? null;
}

// ============================================================
// 1. Classes, Subjects & Teacher Allocation
// ============================================================

export interface ClassAllocationRow {
  class: string;
  level: string;
  subject: string;
  teacher: string;
}

export async function bulkImportClassesAndAllocations(rows: ClassAllocationRow[]): Promise<ActionResult<BulkImportSummary>> {
  try {
    const { supabase, organizationId } = await requireSuperAdmin();
    const teacherDirectory = await loadTeacherDirectory(supabase, organizationId);
    const academicYearId = await getCurrentAcademicYearId(supabase, organizationId);

    const summary = await runBatch(rows, async (row) => {
      const className = required(row.class, "Class");
      const classId = await findOrCreateClass(supabase, organizationId, className, row.level);
      const notes: string[] = [`class "${className}" ready`];

      const subjectName = row.subject?.trim();
      if (!subjectName) {
        return { status: "created", message: notes.join("; ") };
      }

      const subjectId = await findOrCreateSubject(supabase, organizationId, subjectName);
      const classSubjectId = await findOrCreateClassSubject(supabase, classId, subjectId);
      notes.push(`subject "${subjectName}" linked`);

      const teacherIdentifier = row.teacher?.trim();
      if (!teacherIdentifier) {
        return { status: "created", message: notes.join("; ") };
      }

      const teacherId = resolveTeacherId(teacherDirectory, teacherIdentifier);
      if (!teacherId) {
        notes.push(`teacher "${teacherIdentifier}" not found — register them first, then re-paste this row`);
        return { status: "created", message: notes.join("; ") };
      }
      if (!academicYearId) {
        notes.push("no current academic year is set — teacher not assigned");
        return { status: "created", message: notes.join("; ") };
      }

      const { error } = await supabase
        .from("teacher_assignments")
        .insert({ teacher_id: teacherId, class_subject_id: classSubjectId, academic_year_id: academicYearId, active: true });
      if (error && error.code !== "23505") throw new Error(error.message);
      notes.push(error ? "teacher was already assigned" : `teacher assigned`);

      return { status: "created", message: notes.join("; ") };
    });

    return { success: true, data: summary };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================================
// 2. Teachers
// ============================================================

export interface TeacherImportRow {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  qualification: string;
  specialization: string;
}

export async function bulkImportTeachers(rows: TeacherImportRow[]): Promise<ActionResult<BulkImportSummary>> {
  try {
    await requireSuperAdmin();

    const summary = await runBatch(rows, async (row) => {
      const firstName = required(row.first_name, "First name");
      const lastName = required(row.last_name, "Last name");
      const specialization = required(row.specialization, "Specialization");
      const result = await createTeacher({
        first_name: firstName,
        last_name: lastName,
        email: row.email?.trim() ?? "",
        phone: row.phone?.trim() ?? "",
        qualification: row.qualification?.trim() ?? "",
        specialization,
      });
      if (!result.success) throw new Error(result.error);
      return {
        status: "created" as const,
        message: `Created — Teacher ID ${result.data.employeeNumber}${result.data.loginId ? `, login ID ${result.data.loginId}` : ""}`,
      };
    });

    return { success: true, data: summary };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================================
// 3. Parents
// ============================================================

export interface ParentImportRow {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  occupation: string;
  address: string;
}

export async function bulkImportParents(rows: ParentImportRow[]): Promise<ActionResult<BulkImportSummary>> {
  try {
    await requireSuperAdmin();

    const summary = await runBatch(rows, async (row) => {
      const firstName = required(row.first_name, "First name");
      const lastName = required(row.last_name, "Last name");
      const result = await createParent({
        first_name: firstName,
        last_name: lastName,
        email: row.email?.trim() ?? "",
        phone: row.phone?.trim() ?? "",
        occupation: row.occupation?.trim() ?? "",
        address: row.address?.trim() ?? "",
      });
      if (!result.success) throw new Error(result.error);
      return {
        status: "created" as const,
        message: result.data.loginId ? `Created — login ID ${result.data.loginId}` : "Created",
      };
    });

    return { success: true, data: summary };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================================
// 4. Students
// ============================================================

export interface StudentImportRow {
  first_name: string;
  middle_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  class: string;
  level: string;
  enrollment_source: string;
  parent_phone: string;
}

function mapEnrollmentSource(value: string | undefined): "IN_PERSON" | "SOCIAL_MEDIA" {
  const norm = (value ?? "").trim().toLowerCase();
  if (norm.startsWith("social")) return "SOCIAL_MEDIA";
  return "IN_PERSON";
}

export async function bulkImportStudents(rows: StudentImportRow[]): Promise<ActionResult<BulkImportSummary>> {
  try {
    const { supabase, organizationId } = await requireSuperAdmin();
    const academicYearId = await getCurrentAcademicYearId(supabase, organizationId);
    const parentDirectory = await loadParentDirectory(supabase, organizationId);

    const summary = await runBatch(rows, async (row) => {
      const firstName = required(row.first_name, "First name");
      const lastName = required(row.last_name, "Last name");

      const className = required(row.class, "Class");
      if (!academicYearId) throw new Error("No current academic year is set — set one in Settings before importing students.");
      const classId = await findOrCreateClass(supabase, organizationId, className, row.level);

      const result = await createStudent({
        first_name: firstName,
        middle_name: row.middle_name?.trim() ?? "",
        last_name: lastName,
        date_of_birth: row.date_of_birth?.trim() ?? "",
        gender: row.gender?.trim() ?? "",
        phone: "",
        email: "",
        enrollment_source: mapEnrollmentSource(row.enrollment_source),
        class_id: classId,
        academic_year_id: academicYearId,
      });
      if (!result.success) throw new Error(result.error);

      const notes = [`Created — Student ID ${result.data.studentNumber}`];

      const parentPhone = row.parent_phone?.trim();
      if (parentPhone) {
        const parentId = resolveParentId(parentDirectory, parentPhone);
        if (parentId) {
          const linkResult = await linkParentToStudent(result.data.studentId, parentId, "", true);
          notes.push(linkResult.success ? "linked to parent" : `parent link failed: ${linkResult.error}`);
        } else {
          notes.push(`parent phone "${parentPhone}" not found — link manually later`);
        }
      }

      return { status: "created" as const, message: notes.join("; ") };
    });

    return { success: true, data: summary };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================================
// 5. Fees (fee structures)
// ============================================================

export interface FeeImportRow {
  class: string;
  subject: string;
  term: string;
  amount: string;
  description: string;
}

export async function bulkImportFees(rows: FeeImportRow[]): Promise<ActionResult<BulkImportSummary>> {
  try {
    const { supabase, organizationId } = await requireSuperAdmin();
    const academicYearId = await getCurrentAcademicYearId(supabase, organizationId);
    if (!academicYearId) return { success: false, error: "No current academic year is set — set one in Settings first." };

    const summary = await runBatch(rows, async (row) => {
      const className = required(row.class, "Class");
      const amount = Number(row.amount);
      if (!row.amount?.trim() || Number.isNaN(amount) || amount <= 0) {
        throw new Error("Amount must be a positive number.");
      }

      const classId = await findClassId(supabase, organizationId, className);
      if (!classId) throw new Error(`Class "${className}" doesn't exist yet — add it via the Classes tab first.`);

      let termId: string | null = null;
      const termName = row.term?.trim();
      if (termName) {
        const { data: term } = await supabase
          .from("terms")
          .select("id")
          .eq("academic_year_id", academicYearId)
          .ilike("name", termName)
          .maybeSingle();
        termId = (term as { id: string } | null)?.id ?? null;
        if (!termId) throw new Error(`Term "${termName}" wasn't found in the current academic year.`);
      } else {
        termId = await getCurrentTermId(supabase, academicYearId);
      }

      const subjectName = row.subject?.trim();
      if (!subjectName) {
        const { data: existing } = await supabase
          .from("fee_structures")
          .select("id")
          .eq("fee_type", "MATERIALS")
          .eq("class_id", classId)
          .eq("academic_year_id", academicYearId)
          .eq("active", true)
          .maybeSingle();
        if (existing) return { status: "skipped" as const, message: "A materials fee already exists for this class/term." };

        const result = await createMaterialsFeeStructure({
          class_id: classId,
          academic_year_id: academicYearId,
          term_id: termId ?? "",
          amount,
          description: row.description?.trim() ?? "",
        });
        if (!result.success) throw new Error(result.error);
        return { status: "created" as const, message: `Materials fee created for "${className}".` };
      }

      const { data: subject } = await supabase
        .from("subjects")
        .select("id")
        .eq("organization_id", organizationId)
        .ilike("name", subjectName)
        .maybeSingle();
      const subjectId = (subject as { id: string } | null)?.id;
      if (!subjectId) {
        throw new Error(`Subject "${subjectName}" doesn't exist yet — add it via the Classes/Subjects/Allocation tab first.`);
      }
      const classSubjectId = await findClassSubjectId(supabase, classId, subjectId);
      if (!classSubjectId) {
        throw new Error(`Subject "${subjectName}" isn't linked to class "${className}" — add it via the Classes/Subjects/Allocation tab first.`);
      }

      const { data: existing } = await supabase
        .from("fee_structures")
        .select("id")
        .eq("fee_type", "SUBJECT")
        .eq("class_subject_id", classSubjectId)
        .eq("academic_year_id", academicYearId)
        .eq("active", true)
        .maybeSingle();
      if (existing) return { status: "skipped" as const, message: "A fee already exists for this class/subject/term." };

      const result = await createFeeStructure({
        class_subject_id: classSubjectId,
        academic_year_id: academicYearId,
        term_id: termId ?? "",
        amount,
        description: row.description?.trim() ?? "",
      });
      if (!result.success) throw new Error(result.error);
      return { status: "created" as const, message: `Fee created for "${className}" — ${subjectName}.` };
    });

    return { success: true, data: summary };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================================
// 6. Timetable
// ============================================================

export interface TimetableImportRow {
  class: string;
  subject: string;
  teacher: string;
  day: string;
  start_time: string;
  end_time: string;
  type: string;
  location: string;
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function parseDayOfWeek(value: string): number {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    if (n >= 0 && n <= 6) return n;
  }
  const idx = DAY_NAMES.indexOf(trimmed.toLowerCase());
  if (idx === -1) throw new Error(`Day "${value}" isn't recognized — use a day name (Monday) or 0-6 (0 = Sunday).`);
  return idx;
}

function parseSessionType(value: string): SessionType {
  const norm = value.trim().toLowerCase();
  if (!norm || norm === "center" || norm === "centre") return "CENTER";
  if (norm.includes("home")) return "HOME_SERVICE";
  if (norm.includes("online")) return "ONLINE";
  throw new Error(`Session type "${value}" isn't recognized — use Center, Home Service, or Online.`);
}

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function parseTime(value: string, label: string): string {
  const trimmed = value.trim();
  if (!TIME_RE.test(trimmed)) throw new Error(`${label} "${value}" must be a 24-hour time like 14:30.`);
  const [h, m] = trimmed.split(":");
  return `${h.padStart(2, "0")}:${m}`;
}

export async function bulkImportTimetable(rows: TimetableImportRow[]): Promise<ActionResult<BulkImportSummary>> {
  try {
    const { supabase, organizationId } = await requireSuperAdmin();
    const teacherDirectory = await loadTeacherDirectory(supabase, organizationId);

    const summary = await runBatch(rows, async (row) => {
      const className = required(row.class, "Class");
      const subjectName = required(row.subject, "Subject");

      const classId = await findClassId(supabase, organizationId, className);
      if (!classId) throw new Error(`Class "${className}" doesn't exist yet — add it via the Classes tab first.`);
      const { data: subject } = await supabase
        .from("subjects")
        .select("id")
        .eq("organization_id", organizationId)
        .ilike("name", subjectName)
        .maybeSingle();
      const subjectId = (subject as { id: string } | null)?.id;
      if (!subjectId) throw new Error(`Subject "${subjectName}" doesn't exist yet — add it via the Classes tab first.`);
      const classSubjectId = await findClassSubjectId(supabase, classId, subjectId);
      if (!classSubjectId) throw new Error(`Subject "${subjectName}" isn't linked to class "${className}" yet.`);

      const teacherIdentifier = row.teacher?.trim();
      let teacherId = teacherIdentifier ? resolveTeacherId(teacherDirectory, teacherIdentifier) : null;
      if (!teacherId) {
        const { data: assignment } = await supabase
          .from("teacher_assignments")
          .select("teacher_id")
          .eq("class_subject_id", classSubjectId)
          .eq("active", true)
          .limit(1)
          .maybeSingle();
        teacherId = (assignment as { teacher_id: string } | null)?.teacher_id ?? null;
      }
      if (!teacherId) {
        throw new Error(`No teacher found for "${className}" — ${subjectName}. Provide a Teacher column value or assign one first.`);
      }

      const dayOfWeek = parseDayOfWeek(required(row.day, "Day"));
      const startTime = parseTime(required(row.start_time, "Start time"), "Start time");
      const endTime = parseTime(required(row.end_time, "End time"), "End time");
      if (endTime <= startTime) throw new Error("End time must be after start time.");
      const sessionType = parseSessionType(row.type ?? "");

      const { data: existingSlot } = await supabase
        .from("class_schedules")
        .select("id")
        .eq("class_subject_id", classSubjectId)
        .eq("teacher_id", teacherId)
        .eq("day_of_week", dayOfWeek)
        .eq("start_time", startTime)
        .eq("end_time", endTime)
        .maybeSingle();
      if (existingSlot) return { status: "skipped" as const, message: "This exact slot already exists." };

      const roster = await listStudentsForClassSubject(classSubjectId);

      const result = await createSchedule({
        class_subject_id: classSubjectId,
        teacher_id: teacherId,
        slots: [
          {
            day_of_week: dayOfWeek,
            start_time: startTime,
            end_time: endTime,
            session_type: sessionType,
            location: row.location?.trim() ?? "",
            student_ids: roster.map((s) => s.id),
          },
        ],
      });
      if (!result.success) throw new Error(result.error);
      return { status: "created" as const, message: `Slot created with ${roster.length} student${roster.length === 1 ? "" : "s"} rostered.` };
    });

    return { success: true, data: summary };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================================
// 7. Payments
// ============================================================

export interface PaymentImportRow {
  student_id: string;
  amount: string;
  method: string;
  reference: string;
  notes: string;
}

function parsePaymentMethod(value: string): PaymentMethod {
  const norm = value.trim().toLowerCase();
  if (norm === "cash") return "CASH";
  if (norm.includes("momo") || norm.includes("mobile") || norm.includes("mtn")) return "MTN_MOBILE_MONEY";
  throw new Error(`Payment method "${value}" isn't recognized — use Cash or Mobile Money.`);
}

export async function bulkImportPayments(rows: PaymentImportRow[]): Promise<ActionResult<BulkImportSummary>> {
  try {
    const { supabase, organizationId } = await requireSuperAdmin();

    const summary = await runBatch(rows, async (row) => {
      const studentNumber = required(row.student_id, "Student ID");
      const amount = Number(row.amount);
      if (!row.amount?.trim() || Number.isNaN(amount) || amount <= 0) {
        throw new Error("Amount must be a positive number.");
      }
      const method = parsePaymentMethod(required(row.method, "Method"));

      const { data: student } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("organization_id", organizationId)
        .ilike("student_number", studentNumber)
        .maybeSingle();
      const studentId = (student as { id: string } | null)?.id;
      if (!studentId) throw new Error(`Student "${studentNumber}" not found.`);

      const { data: charges } = await supabase
        .from("student_charges")
        .select("id, amount_due, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: true });

      const chargeRows = (charges as { id: string; amount_due: number; created_at: string }[]) ?? [];
      const { data: allocations } = chargeRows.length
        ? await supabase
            .from("payment_allocations")
            .select("student_charge_id, amount_allocated")
            .in(
              "student_charge_id",
              chargeRows.map((c) => c.id)
            )
        : { data: [] };

      const paidByCharge = new Map<string, number>();
      ((allocations as { student_charge_id: string; amount_allocated: number }[]) ?? []).forEach((a) => {
        paidByCharge.set(a.student_charge_id, (paidByCharge.get(a.student_charge_id) ?? 0) + a.amount_allocated);
      });

      let remaining = amount;
      const newAllocations: { student_charge_id: string; amount_allocated: number }[] = [];
      for (const charge of chargeRows) {
        if (remaining <= 0) break;
        const balance = Math.round((charge.amount_due - (paidByCharge.get(charge.id) ?? 0)) * 100) / 100;
        if (balance <= 0) continue;
        const alloc = Math.min(remaining, balance);
        newAllocations.push({ student_charge_id: charge.id, amount_allocated: alloc });
        remaining = Math.round((remaining - alloc) * 100) / 100;
      }

      const result = await createPayment({
        student_id: studentId,
        amount,
        payment_method: method,
        reference: row.reference?.trim() ?? "",
        notes: row.notes?.trim() ?? "",
        allocations: newAllocations,
      });
      if (!result.success) throw new Error(result.error);

      if (newAllocations.length === 0) {
        return { status: "created" as const, message: "Recorded — no outstanding charges to allocate against." };
      }
      if (remaining > 0.001) {
        return { status: "created" as const, message: `Recorded — GH₵${remaining.toFixed(2)} left unallocated (exceeds outstanding balance).` };
      }
      return { status: "created" as const, message: `Recorded and allocated across ${newAllocations.length} charge${newAllocations.length === 1 ? "" : "s"}.` };
    });

    return { success: true, data: summary };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
