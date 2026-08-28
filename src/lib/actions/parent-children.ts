"use server";

import { createClient } from "@/lib/supabase/server";
import { getStudentPhotoUrl } from "@/lib/actions/student-photo";

export interface MyChildRow {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  photo_url: string | null;
  class_name: string | null;
  academic_level_name: string | null;
  location_summary: string | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

// Uses the caller's own session — RLS (students_parent_view,
// parent_students_parent_view) is what actually stops a parent from ever
// seeing another family's child, this query just mirrors that scoping
// for clarity. See rls_policies.sql §12–13.
export async function listMyChildren(): Promise<MyChildRow[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: parentProfile } = await supabase
    .from("parent_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const parentId = (parentProfile as { id: string } | null)?.id;
  if (!parentId) return [];

  const { data: links } = await supabase
    .from("parent_students")
    .select(
      "student_profiles(id, first_name, last_name, status, passport_photo_path, organization_id)"
    )
    .eq("parent_id", parentId);

  type S = {
    id: string;
    first_name: string;
    last_name: string;
    status: string;
    passport_photo_path: string | null;
    organization_id: string;
  };
  type Raw = { student_profiles: S | S[] | null };

  const students = ((links as Raw[]) ?? [])
    .map((l) => one(l.student_profiles))
    .filter((s): s is S => s !== null);

  if (students.length === 0) return [];

  const ids = students.map((s) => s.id);

  const [{ data: currentYear }, { data: locations }] = await Promise.all([
    supabase
      .from("academic_years")
      .select("id")
      .eq("organization_id", students[0].organization_id)
      .eq("is_current", true)
      .single(),
    supabase
      .from("student_locations")
      .select("student_id, area, city")
      .in("student_id", ids)
      .eq("is_current", true),
  ]);

  const yearId = (currentYear as { id: string } | null)?.id;

  const { data: enrollments } = yearId
    ? await supabase
        .from("student_enrollments")
        .select("student_id, classes(name, academic_levels(name))")
        .in("student_id", ids)
        .eq("academic_year_id", yearId)
        .eq("status", "ACTIVE")
    : { data: [] };

  type EnrollRaw = {
    student_id: string;
    classes: { name: string; academic_levels: { name: string } | { name: string }[] | null } | { name: string; academic_levels: { name: string } | { name: string }[] | null }[] | null;
  };
  const enrollByStudent = new Map<string, { class_name: string; level_name: string }>();
  ((enrollments as EnrollRaw[]) ?? []).forEach((e) => {
    const cls = one(e.classes);
    if (cls) enrollByStudent.set(e.student_id, { class_name: cls.name, level_name: one(cls.academic_levels)?.name ?? "—" });
  });

  type LocRaw = { student_id: string; area: string | null; city: string | null };
  const locByStudent = new Map<string, string>();
  ((locations as LocRaw[]) ?? []).forEach((l) => {
    locByStudent.set(l.student_id, [l.area, l.city].filter(Boolean).join(", ") || "—");
  });

  const photoUrls = await Promise.all(students.map((s) => getStudentPhotoUrl(s.passport_photo_path)));

  return students.map((s, i) => {
    const enrollment = enrollByStudent.get(s.id);
    return {
      id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      status: s.status,
      photo_url: photoUrls[i],
      class_name: enrollment?.class_name ?? null,
      academic_level_name: enrollment?.level_name ?? null,
      location_summary: locByStudent.get(s.id) ?? null,
    };
  });
}

export interface MyChildDetail {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  status: string;
  enrollment_source: "IN_PERSON" | "SOCIAL_MEDIA" | null;
  passport_photo_path: string | null;
}

// Single-child fetch for the child detail page. The parent_students join
// is a defense-in-depth ownership check on top of RLS (students_parent_view
// already restricts this the same way) — belt and suspenders for a
// protected-data page, not the only thing standing between a parent and
// another family's child.
export async function getMyChild(studentId: string): Promise<MyChildDetail | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: parentProfile } = await supabase.from("parent_profiles").select("id").eq("user_id", user.id).single();
  const parentId = (parentProfile as { id: string } | null)?.id;
  if (!parentId) return null;

  const { data: link } = await supabase
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", parentId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!link) return null;

  const { data } = await supabase
    .from("student_profiles")
    .select(
      "id, student_number, first_name, last_name, date_of_birth, gender, status, enrollment_source, passport_photo_path"
    )
    .eq("id", studentId)
    .single();

  return (data as MyChildDetail) ?? null;
}
