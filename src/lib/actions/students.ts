"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { requireStudent } from "@/lib/auth/require-student";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface StudentListRow {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  status: string;
  enrollment_source: "IN_PERSON" | "SOCIAL_MEDIA" | null;
  passport_photo_path: string | null;
  academic_level_name: string | null;
  class_name: string | null;
  current_location: string | null;
  parent_names: string;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

export async function listStudents(): Promise<StudentListRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  const [{ data: students }, { data: currentYear }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, student_number, first_name, last_name, status, enrollment_source, passport_photo_path")
      .eq("organization_id", organizationId)
      .order("last_name", { ascending: true }),
    supabase
      .from("academic_years")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("is_current", true)
      .single(),
  ]);

  const studentRows = (students as StudentListRow[]) ?? [];
  if (studentRows.length === 0) return [];

  const ids = studentRows.map((s) => s.id);
  const yearId = (currentYear as { id: string } | null)?.id;

  const [{ data: enrollments }, { data: locations }, { data: parentLinks }] = await Promise.all([
    yearId
      ? supabase
          .from("student_enrollments")
          .select("student_id, status, classes(name, academic_levels(name))")
          .in("student_id", ids)
          .eq("academic_year_id", yearId)
          .eq("status", "ACTIVE")
      : Promise.resolve({ data: [] }),
    supabase
      .from("student_locations")
      .select("student_id, area, city")
      .in("student_id", ids)
      .eq("is_current", true),
    supabase
      .from("parent_students")
      .select("student_id, parent_profiles(users(first_name, last_name))")
      .in("student_id", ids),
  ]);

  type EnrollRaw = {
    student_id: string;
    classes: { name: string; academic_levels: { name: string } | { name: string }[] | null } | { name: string; academic_levels: { name: string } | { name: string }[] | null }[] | null;
  };
  const enrollByStudent = new Map<string, { class_name: string; level_name: string }>();
  ((enrollments as EnrollRaw[]) ?? []).forEach((e) => {
    const cls = one(e.classes);
    if (cls) {
      enrollByStudent.set(e.student_id, { class_name: cls.name, level_name: one(cls.academic_levels)?.name ?? "—" });
    }
  });

  type LocRaw = { student_id: string; area: string | null; city: string | null };
  const locByStudent = new Map<string, string>();
  ((locations as LocRaw[]) ?? []).forEach((l) => {
    locByStudent.set(l.student_id, [l.area, l.city].filter(Boolean).join(", ") || "—");
  });

  type ParentRaw = {
    student_id: string;
    parent_profiles: { users: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null } | { users: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null }[] | null;
  };
  const parentsByStudent = new Map<string, string[]>();
  ((parentLinks as ParentRaw[]) ?? []).forEach((p) => {
    const profile = one(p.parent_profiles);
    const u = one(profile?.users ?? null);
    if (u) {
      const list = parentsByStudent.get(p.student_id) ?? [];
      list.push(`${u.first_name} ${u.last_name}`);
      parentsByStudent.set(p.student_id, list);
    }
  });

  return studentRows.map((s) => {
    const enrollment = enrollByStudent.get(s.id);
    return {
      ...s,
      academic_level_name: enrollment?.level_name ?? null,
      class_name: enrollment?.class_name ?? null,
      current_location: locByStudent.get(s.id) ?? null,
      parent_names: (parentsByStudent.get(s.id) ?? []).join(", ") || "—",
    };
  });
}

function generateStudentNumber(sequence: number) {
  const year = new Date().getFullYear();
  return `ZIVA-${year}-${String(sequence).padStart(4, "0")}`;
}

export async function createStudent(input: {
  first_name: string;
  middle_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  enrollment_source: "IN_PERSON" | "SOCIAL_MEDIA";
  class_id: string;
  academic_year_id: string;
}): Promise<ActionResult<{ studentId: string }>> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    if (!input.first_name || !input.last_name) {
      return { success: false, error: "First name and last name are required." };
    }

    const { count } = await supabase
      .from("student_profiles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    const studentNumber = generateStudentNumber((count ?? 0) + 1);

    const { data: inserted, error } = await supabase
      .from("student_profiles")
      .insert({
        organization_id: organizationId,
        student_number: studentNumber,
        first_name: input.first_name,
        middle_name: input.middle_name || null,
        last_name: input.last_name,
        date_of_birth: input.date_of_birth || null,
        gender: input.gender || null,
        phone: input.phone || null,
        email: input.email || null,
        enrollment_source: input.enrollment_source,
        status: "ACTIVE",
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return {
        success: false,
        error: error?.code === "23505" ? "That student number is already in use — try again." : error?.message ?? "Could not create student.",
      };
    }

    const studentId = (inserted as { id: string }).id;

    if (input.class_id && input.academic_year_id) {
      const { error: enrollError } = await supabase.from("student_enrollments").insert({
        student_id: studentId,
        class_id: input.class_id,
        academic_year_id: input.academic_year_id,
        status: "ACTIVE",
      });
      if (enrollError) {
        return { success: false, error: `Student created, but enrollment failed: ${enrollError.message}` };
      }
    }

    revalidatePath("/admin/students");
    return { success: true, data: { studentId } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export interface MyStudentRow {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  class_name: string;
  subject_names: string[];
}

// Every student in any class/subject this teacher actually teaches
// (student_subjects, not just class enrollment — a teacher only sees the
// students taking their specific subject, matching students_teacher_view/
// student_subjects_teacher_view RLS). Deduplicated across subjects.
export async function listMyStudents(): Promise<MyStudentRow[]> {
  const { supabase, teacherId } = await requireTeacher();

  const { data: assignments } = await supabase
    .from("teacher_assignments")
    .select("class_subject_id")
    .eq("teacher_id", teacherId)
    .eq("active", true);

  const classSubjectIds = ((assignments as { class_subject_id: string }[]) ?? []).map((a) => a.class_subject_id);
  if (classSubjectIds.length === 0) return [];

  const { data } = await supabase
    .from("student_subjects")
    .select(
      "class_subjects(classes(name), subjects(name)), student_profiles(id, first_name, last_name, status)"
    )
    .in("class_subject_id", classSubjectIds);

  type Nested = { name: string } | { name: string }[] | null;
  type CS = { classes: Nested; subjects: Nested } | { classes: Nested; subjects: Nested }[] | null;
  type S = { id: string; first_name: string; last_name: string; status: string };
  type Raw = { class_subjects: CS; student_profiles: S | S[] | null };

  const byStudent = new Map<string, MyStudentRow>();
  ((data as Raw[]) ?? []).forEach((row) => {
    const student = one(row.student_profiles);
    if (!student) return;
    const cs = one(row.class_subjects);
    const className = one(cs?.classes ?? null)?.name ?? "—";
    const subjectName = one(cs?.subjects ?? null)?.name ?? "—";

    const existing = byStudent.get(student.id);
    if (existing) {
      if (!existing.subject_names.includes(subjectName)) existing.subject_names.push(subjectName);
    } else {
      byStudent.set(student.id, {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        status: student.status,
        class_name: className,
        subject_names: [subjectName],
      });
    }
  });

  return Array.from(byStudent.values()).sort((a, b) => a.last_name.localeCompare(b.last_name));
}

export interface StudentDetail {
  id: string;
  student_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  enrollment_source: "IN_PERSON" | "SOCIAL_MEDIA" | null;
  passport_photo_path: string | null;
  optional_user_id: string | null;
  account_email: string | null;
  account_phone: string | null;
}

const STUDENT_DETAIL_SELECT =
  "id, student_number, first_name, middle_name, last_name, date_of_birth, gender, phone, email, status, enrollment_source, passport_photo_path, optional_user_id, users(email, phone)";

type StudentDetailRaw = Omit<StudentDetail, "account_email" | "account_phone"> & {
  users: { email: string | null; phone: string | null } | { email: string | null; phone: string | null }[] | null;
};

function mapStudentDetail(data: unknown): StudentDetail {
  const row = data as StudentDetailRaw;
  const u = Array.isArray(row.users) ? row.users[0] : row.users;
  return { ...row, account_email: u?.email ?? null, account_phone: u?.phone ?? null };
}

export async function getStudent(id: string): Promise<StudentDetail | null> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("student_profiles")
    .select(STUDENT_DETAIL_SELECT)
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  return data ? mapStudentDetail(data) : null;
}

// Read-only, for the student's own Profile page.
export async function getMyStudentProfile(): Promise<StudentDetail | null> {
  const { supabase, studentId } = await requireStudent();

  const { data } = await supabase
    .from("student_profiles")
    .select(STUDENT_DETAIL_SELECT)
    .eq("id", studentId)
    .single();

  return data ? mapStudentDetail(data) : null;
}

function generateStudentTempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Provisions a login for a student who already exists as a plain
// student_profiles row (created via createStudent). Mirrors createTeacher/
// createParent's account-creation shape, except there's no new profile
// table row to insert — just a users row plus setting
// student_profiles.optional_user_id, which is what students_self_view and
// every current_student_id()-based RLS policy key off of.
export async function provisionStudentAccount(
  studentId: string,
  email: string
): Promise<ActionResult<{ tempPassword: string }>> {
  try {
    const { organizationId } = await requireAdmin();

    if (!email) return { success: false, error: "Email is required." };

    const admin = createAdminClient();

    const { data: student } = await admin
      .from("student_profiles")
      .select("id, first_name, last_name, optional_user_id")
      .eq("id", studentId)
      .eq("organization_id", organizationId)
      .single();

    const row = student as { id: string; first_name: string; last_name: string; optional_user_id: string | null } | null;
    if (!row) return { success: false, error: "Student not found." };
    if (row.optional_user_id) return { success: false, error: "This student already has an account." };

    const tempPassword = generateStudentTempPassword();

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { first_name: row.first_name, last_name: row.last_name, role: "STUDENT" },
    });

    if (authError || !authUser.user) {
      return { success: false, error: authError?.message ?? "Could not create the account." };
    }

    const { error: userError } = await admin.from("users").insert({
      id: authUser.user.id,
      organization_id: organizationId,
      role: "STUDENT",
      first_name: row.first_name,
      last_name: row.last_name,
      email,
    });

    if (userError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return {
        success: false,
        error: userError.code === "23505" ? "That email is already in use by another account." : userError.message,
      };
    }

    const { error: linkError } = await admin
      .from("student_profiles")
      .update({ optional_user_id: authUser.user.id })
      .eq("id", studentId);

    if (linkError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: linkError.message };
    }

    revalidatePath(`/admin/students/${studentId}`);
    return { success: true, data: { tempPassword } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export interface CurrentEnrollment {
  class_id: string;
  class_name: string;
  academic_year_id: string;
  academic_year_name: string;
}

// Read-only, shared by admin/teacher/parent/student — RLS scopes
// visibility per role; this just needs a signed-in session.
export async function getStudentCurrentEnrollment(studentId: string): Promise<CurrentEnrollment | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("student_enrollments")
    .select("class_id, classes(name), academic_year_id, academic_years(name, is_current)")
    .eq("student_id", studentId)
    .eq("status", "ACTIVE");

  type Raw = {
    class_id: string;
    classes: { name: string } | { name: string }[] | null;
    academic_year_id: string;
    academic_years: { name: string; is_current: boolean } | { name: string; is_current: boolean }[] | null;
  };

  const rows = (data as Raw[]) ?? [];
  const current = rows.find((r) => one(r.academic_years)?.is_current) ?? rows[0];
  if (!current) return null;

  return {
    class_id: current.class_id,
    class_name: one(current.classes)?.name ?? "—",
    academic_year_id: current.academic_year_id,
    academic_year_name: one(current.academic_years)?.name ?? "—",
  };
}

export async function setStudentStatus(id: string, status: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("student_profiles")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/admin/students/${id}`);
    revalidatePath("/admin/students");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
