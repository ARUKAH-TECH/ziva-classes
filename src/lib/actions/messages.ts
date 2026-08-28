"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/auth/require-admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { createClient } from "@/lib/supabase/server";

export interface Contact {
  user_id: string;
  name: string;
  role: string;
}

export interface ConversationRow {
  other_user_id: string;
  other_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface MessageRow {
  id: string;
  sender_id: string;
  subject: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
  is_mine: boolean;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// Admin: every teacher and parent in the org. Teacher: the admins, plus
// parents of their own assigned students — mirrors the same
// teacher_assignments-backed scoping used everywhere else, not an
// open contact list.
export async function listMessageableContacts(): Promise<Contact[]> {
  const supabase = await createClient();
  const uid = await currentUserId();
  if (!uid) return [];

  const { data: me } = await supabase.from("users").select("role, organization_id").eq("id", uid).single();
  const role = (me as { role: string; organization_id: string } | null)?.role;

  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    const { organizationId } = await requireAdmin();
    const { data } = await supabase
      .from("users")
      .select("id, first_name, last_name, role")
      .eq("organization_id", organizationId)
      .in("role", ["TEACHER", "PARENT"])
      .neq("id", uid);
    type Raw = { id: string; first_name: string; last_name: string; role: string };
    return ((data as Raw[]) ?? []).map((u) => ({ user_id: u.id, name: `${u.first_name} ${u.last_name}`, role: u.role }));
  }

  if (role === "TEACHER") {
    const { supabase: s2, teacherId, organizationId } = await requireTeacher();

    const { data: admins } = await s2
      .from("users")
      .select("id, first_name, last_name, role")
      .eq("organization_id", organizationId)
      .in("role", ["ADMIN", "SUPER_ADMIN"]);

    const { data: assignments } = await s2
      .from("teacher_assignments")
      .select("class_subject_id, class_subjects(class_id)")
      .eq("teacher_id", teacherId)
      .eq("active", true);

    type CS = { class_id: string } | { class_id: string }[] | null;
    const classIds = new Set(
      ((assignments as { class_subject_id: string; class_subjects: CS }[]) ?? [])
        .map((a) => one(a.class_subjects)?.class_id)
        .filter((id): id is string => !!id)
    );

    const { data: enrolledStudents } = await s2
      .from("student_enrollments")
      .select("student_id, class_id")
      .in("class_id", Array.from(classIds))
      .eq("status", "ACTIVE");

    const studentIds = Array.from(new Set(((enrolledStudents as { student_id: string }[]) ?? []).map((e) => e.student_id)));

    const { data: parentLinks } = await s2
      .from("parent_students")
      .select("parent_profiles(user_id, users(first_name, last_name))")
      .in("student_id", studentIds.length > 0 ? studentIds : ["00000000-0000-0000-0000-000000000000"]);

    type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
    type PP = { user_id: string; users: U } | { user_id: string; users: U }[] | null;
    type ParentRaw = { parent_profiles: PP };

    const parentContacts = new Map<string, Contact>();
    ((parentLinks as ParentRaw[]) ?? []).forEach((p) => {
      const pp = one(p.parent_profiles);
      const u = one(pp?.users ?? null);
      if (pp && u) parentContacts.set(pp.user_id, { user_id: pp.user_id, name: `${u.first_name} ${u.last_name}`, role: "PARENT" });
    });

    type AdminRaw = { id: string; first_name: string; last_name: string; role: string };
    const adminContacts = ((admins as AdminRaw[]) ?? []).map((u) => ({
      user_id: u.id,
      name: `${u.first_name} ${u.last_name}`,
      role: u.role,
    }));

    return [...adminContacts, ...Array.from(parentContacts.values())];
  }

  // Parents/students message the admin(s) of their org.
  const { data: org } = await supabase.from("users").select("organization_id").eq("id", uid).single();
  const orgId = (org as { organization_id: string } | null)?.organization_id;
  if (!orgId) return [];
  const { data } = await supabase
    .from("users")
    .select("id, first_name, last_name, role")
    .eq("organization_id", orgId)
    .in("role", ["ADMIN", "SUPER_ADMIN"]);
  type Raw = { id: string; first_name: string; last_name: string; role: string };
  return ((data as Raw[]) ?? []).map((u) => ({ user_id: u.id, name: `${u.first_name} ${u.last_name}`, role: u.role }));
}

export async function listConversations(): Promise<ConversationRow[]> {
  const supabase = await createClient();
  const uid = await currentUserId();
  if (!uid) return [];

  const { data } = await supabase
    .from("messages")
    .select("sender_id, receiver_id, subject, message, read_at, created_at")
    .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
    .order("created_at", { ascending: false });

  type Raw = {
    sender_id: string;
    receiver_id: string;
    message: string;
    read_at: string | null;
    created_at: string;
  };
  const rows = (data as Raw[]) ?? [];

  const byOther = new Map<string, ConversationRow>();
  for (const r of rows) {
    const otherId = r.sender_id === uid ? r.receiver_id : r.sender_id;
    const existing = byOther.get(otherId);
    if (!existing) {
      byOther.set(otherId, {
        other_user_id: otherId,
        other_name: "",
        last_message: r.message,
        last_message_at: r.created_at,
        unread_count: r.receiver_id === uid && !r.read_at ? 1 : 0,
      });
    } else if (r.receiver_id === uid && !r.read_at) {
      existing.unread_count += 1;
    }
  }

  const otherIds = Array.from(byOther.keys());
  if (otherIds.length === 0) return [];

  const { data: users } = await supabase.from("users").select("id, first_name, last_name").in("id", otherIds);
  type U = { id: string; first_name: string; last_name: string };
  const nameById = new Map(((users as U[]) ?? []).map((u) => [u.id, `${u.first_name} ${u.last_name}`]));

  return Array.from(byOther.values())
    .map((c) => ({ ...c, other_name: nameById.get(c.other_user_id) ?? "—" }))
    .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
}

export async function listThread(otherUserId: string): Promise<MessageRow[]> {
  const supabase = await createClient();
  const uid = await currentUserId();
  if (!uid) return [];

  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, subject, message, read_at, created_at")
    .or(
      `and(sender_id.eq.${uid},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${uid})`
    )
    .order("created_at", { ascending: true });

  type Raw = { id: string; sender_id: string; subject: string | null; message: string; read_at: string | null; created_at: string };

  // Mark incoming messages as read.
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", otherUserId)
    .eq("receiver_id", uid)
    .is("read_at", null);

  return ((data as Raw[]) ?? []).map((m) => ({ ...m, is_mine: m.sender_id === uid }));
}

export async function sendMessage(receiverId: string, subject: string, message: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const uid = await currentUserId();
    if (!uid) return { success: false, error: "You must be signed in." };
    if (!message.trim()) return { success: false, error: "Message cannot be empty." };

    const { data: me } = await supabase.from("users").select("organization_id").eq("id", uid).single();
    const orgId = (me as { organization_id: string } | null)?.organization_id;
    if (!orgId) return { success: false, error: "No organization found." };

    const { error } = await supabase.from("messages").insert({
      organization_id: orgId,
      sender_id: uid,
      receiver_id: receiverId,
      subject: subject || null,
      message,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/communication");
    revalidatePath("/teacher/messages");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
