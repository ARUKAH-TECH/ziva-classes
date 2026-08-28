"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { requireParent } from "@/lib/auth/require-parent";
import { requireStudent } from "@/lib/auth/require-student";
import type { SessionType } from "@/lib/constants";

export interface ScheduleRow {
  id: string;
  class_subject_id: string;
  class_name: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_type: SessionType;
  location: string | null;
  recurring: boolean;
  active: boolean;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

export async function listSchedules(): Promise<ScheduleRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("class_schedules")
    .select(
      "id, class_subject_id, teacher_id, day_of_week, start_time, end_time, session_type, location, recurring, active, class_subjects(classes(name), subjects(name)), teacher_profiles(users(first_name, last_name))"
    )
    .eq("organization_id", organizationId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  type Nested = { name: string } | { name: string }[] | null;
  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type Raw = {
    id: string;
    class_subject_id: string;
    teacher_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    session_type: SessionType;
    location: string | null;
    recurring: boolean;
    active: boolean;
    class_subjects: { classes: Nested; subjects: Nested } | { classes: Nested; subjects: Nested }[] | null;
    teacher_profiles: { users: U } | { users: U }[] | null;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const cs = one(row.class_subjects);
    const teacher = one(one(row.teacher_profiles)?.users ?? null);
    return {
      id: row.id,
      class_subject_id: row.class_subject_id,
      class_name: one(cs?.classes ?? null)?.name ?? "—",
      subject_name: one(cs?.subjects ?? null)?.name ?? "—",
      teacher_id: row.teacher_id,
      teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : "—",
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      session_type: row.session_type,
      location: row.location,
      recurring: row.recurring,
      active: row.active,
    };
  });
}

export async function listMySchedule(): Promise<ScheduleRow[]> {
  const { supabase, teacherId } = await requireTeacher();

  const { data } = await supabase
    .from("class_schedules")
    .select(
      "id, class_subject_id, teacher_id, day_of_week, start_time, end_time, session_type, location, recurring, active, class_subjects(classes(name), subjects(name)), teacher_profiles(users(first_name, last_name))"
    )
    .eq("teacher_id", teacherId)
    .eq("active", true)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  type Nested = { name: string } | { name: string }[] | null;
  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type Raw = {
    id: string;
    class_subject_id: string;
    teacher_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    session_type: SessionType;
    location: string | null;
    recurring: boolean;
    active: boolean;
    class_subjects: { classes: Nested; subjects: Nested } | { classes: Nested; subjects: Nested }[] | null;
    teacher_profiles: { users: U } | { users: U }[] | null;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const cs = one(row.class_subjects);
    const teacher = one(one(row.teacher_profiles)?.users ?? null);
    return {
      id: row.id,
      class_subject_id: row.class_subject_id,
      class_name: one(cs?.classes ?? null)?.name ?? "—",
      subject_name: one(cs?.subjects ?? null)?.name ?? "—",
      teacher_id: row.teacher_id,
      teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : "—",
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      session_type: row.session_type,
      location: row.location,
      recurring: row.recurring,
      active: row.active,
    };
  });
}

export interface ChildScheduleRow extends ScheduleRow {
  child_names: string[];
}

// A parent may have children in different classes — group schedule rows by
// class, then attach every child (of theirs) enrolled in that class so the
// same slot isn't duplicated per child.
export async function listMyChildrenSchedule(): Promise<ChildScheduleRow[]> {
  const { supabase, parentId, organizationId } = await requireParent();

  const { data: links } = await supabase
    .from("parent_students")
    .select("student_profiles(id, first_name, last_name)")
    .eq("parent_id", parentId);

  type S = { id: string; first_name: string; last_name: string };
  type LinkRaw = { student_profiles: S | S[] | null };
  const students = ((links as LinkRaw[]) ?? [])
    .map((l) => one(l.student_profiles))
    .filter((s): s is S => s !== null);

  if (students.length === 0) return [];

  const { data: currentYear } = await supabase
    .from("academic_years")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_current", true)
    .single();
  const yearId = (currentYear as { id: string } | null)?.id;
  if (!yearId) return [];

  const { data: enrollments } = await supabase
    .from("student_enrollments")
    .select("student_id, class_id")
    .in(
      "student_id",
      students.map((s) => s.id)
    )
    .eq("academic_year_id", yearId)
    .eq("status", "ACTIVE");

  type EnrollRaw = { student_id: string; class_id: string };
  const childrenByClass = new Map<string, string[]>();
  ((enrollments as EnrollRaw[]) ?? []).forEach((e) => {
    const student = students.find((s) => s.id === e.student_id);
    if (!student) return;
    const name = `${student.first_name} ${student.last_name}`;
    childrenByClass.set(e.class_id, [...(childrenByClass.get(e.class_id) ?? []), name]);
  });

  const classIds = Array.from(childrenByClass.keys());
  if (classIds.length === 0) return [];

  const { data } = await supabase
    .from("class_schedules")
    .select(
      "id, class_subject_id, teacher_id, day_of_week, start_time, end_time, session_type, location, recurring, active, class_subjects!inner(class_id, classes(name), subjects(name)), teacher_profiles(users(first_name, last_name))"
    )
    .eq("active", true)
    .in("class_subjects.class_id", classIds)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  type Nested = { name: string } | { name: string }[] | null;
  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type Raw = {
    id: string;
    class_subject_id: string;
    teacher_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    session_type: SessionType;
    location: string | null;
    recurring: boolean;
    active: boolean;
    class_subjects: { class_id: string; classes: Nested; subjects: Nested } | { class_id: string; classes: Nested; subjects: Nested }[] | null;
    teacher_profiles: { users: U } | { users: U }[] | null;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const cs = one(row.class_subjects);
    const teacher = one(one(row.teacher_profiles)?.users ?? null);
    return {
      id: row.id,
      class_subject_id: row.class_subject_id,
      class_name: one(cs?.classes ?? null)?.name ?? "—",
      subject_name: one(cs?.subjects ?? null)?.name ?? "—",
      teacher_id: row.teacher_id,
      teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : "—",
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      session_type: row.session_type,
      location: row.location,
      recurring: row.recurring,
      active: row.active,
      child_names: cs ? childrenByClass.get(cs.class_id) ?? [] : [],
    };
  });
}

// RLS's schedules_student_view (010) already scopes this to the student's
// own student_subjects — no explicit class/subject filter needed here.
export async function listMyOwnSchedule(): Promise<ScheduleRow[]> {
  const { supabase } = await requireStudent();

  const { data } = await supabase
    .from("class_schedules")
    .select(
      "id, class_subject_id, teacher_id, day_of_week, start_time, end_time, session_type, location, recurring, active, class_subjects(classes(name), subjects(name)), teacher_profiles(users(first_name, last_name))"
    )
    .eq("active", true)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  type Nested = { name: string } | { name: string }[] | null;
  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type Raw = {
    id: string;
    class_subject_id: string;
    teacher_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    session_type: SessionType;
    location: string | null;
    recurring: boolean;
    active: boolean;
    class_subjects: { classes: Nested; subjects: Nested } | { classes: Nested; subjects: Nested }[] | null;
    teacher_profiles: { users: U } | { users: U }[] | null;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const cs = one(row.class_subjects);
    const teacher = one(one(row.teacher_profiles)?.users ?? null);
    return {
      id: row.id,
      class_subject_id: row.class_subject_id,
      class_name: one(cs?.classes ?? null)?.name ?? "—",
      subject_name: one(cs?.subjects ?? null)?.name ?? "—",
      teacher_id: row.teacher_id,
      teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : "—",
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      session_type: row.session_type,
      location: row.location,
      recurring: row.recurring,
      active: row.active,
    };
  });
}

export interface ClassSubjectTeacherOption {
  class_subject_id: string;
  class_name: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
}

// Only class+subject+teacher combinations backed by a real
// teacher_assignments row — a schedule can't be created for a teacher who
// isn't actually assigned to that class/subject (§52: no fake relationships).
export async function listScheduleOptions(): Promise<ClassSubjectTeacherOption[]> {
  const { supabase, organizationId } = await requireAdmin();

  const { data } = await supabase
    .from("teacher_assignments")
    .select(
      "class_subject_id, teacher_id, active, class_subjects!inner(classes!inner(name, organization_id), subjects(name)), teacher_profiles(users(first_name, last_name))"
    )
    .eq("active", true)
    .eq("class_subjects.classes.organization_id", organizationId);

  type Nested = { name: string } | { name: string }[] | null;
  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type Raw = {
    class_subject_id: string;
    teacher_id: string;
    class_subjects: { classes: Nested; subjects: Nested } | { classes: Nested; subjects: Nested }[] | null;
    teacher_profiles: { users: U } | { users: U }[] | null;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const cs = one(row.class_subjects);
    const teacher = one(one(row.teacher_profiles)?.users ?? null);
    return {
      class_subject_id: row.class_subject_id,
      class_name: one(cs?.classes ?? null)?.name ?? "—",
      subject_name: one(cs?.subjects ?? null)?.name ?? "—",
      teacher_id: row.teacher_id,
      teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : "—",
    };
  });
}

export async function createSchedule(input: {
  class_subject_id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_type: SessionType;
  location: string;
}): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    if (!input.class_subject_id || !input.teacher_id || !input.start_time || !input.end_time) {
      return { success: false, error: "Class/subject, teacher, and times are required." };
    }
    if (input.end_time <= input.start_time) {
      return { success: false, error: "End time must be after the start time." };
    }

    const { error } = await supabase.from("class_schedules").insert({
      organization_id: organizationId,
      class_subject_id: input.class_subject_id,
      teacher_id: input.teacher_id,
      day_of_week: input.day_of_week,
      start_time: input.start_time,
      end_time: input.end_time,
      session_type: input.session_type,
      location: input.location || null,
      recurring: true,
      active: true,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/timetable");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function setScheduleActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("class_schedules")
      .update({ active })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/timetable");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteSchedule(id: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { error } = await supabase
      .from("class_schedules")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) {
      return {
        success: false,
        error: error.code === "23503" ? "Sessions already exist from this schedule — deactivate it instead." : error.message,
      };
    }

    revalidatePath("/admin/timetable");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
