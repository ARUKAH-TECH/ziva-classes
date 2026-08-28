"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "student-photos";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export type ChangeRequestType = "PHOTO" | "LOCATION";
export type ChangeRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ChangeRequestRow {
  id: string;
  student_id: string;
  student_name: string;
  parent_name: string;
  request_type: ChangeRequestType;
  payload: Record<string, string>;
  status: ChangeRequestStatus;
  review_notes: string | null;
  created_at: string;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

async function currentParentContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: parentProfile } = await supabase.from("parent_profiles").select("id").eq("user_id", user.id).single();
  const parentId = (parentProfile as { id: string } | null)?.id;
  if (!parentId) throw new Error("No parent profile found for this account.");

  return { supabase, parentId };
}

// Explicit ownership check performed *before* any privileged (RLS-bypassing)
// operation — e.g. requestPhotoChange's storage write via the service-role
// client happens before the parent_change_requests row is ever inserted, so
// it can't rely on that row's own RLS WITH CHECK to reject an unrelated
// student after the fact. Mirrors exactly what parent_change_requests_parent_insert
// checks, just evaluated up front instead of as a side effect of an insert failing.
async function verifyParentOwnsStudent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentId: string,
  studentId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", parentId)
    .eq("student_id", studentId)
    .maybeSingle();
  return !!data;
}

async function orgAllows(supabase: Awaited<ReturnType<typeof createClient>>, studentId: string, key: "parent_can_edit_location" | "parent_can_edit_photo") {
  const { data: student } = await supabase.from("student_profiles").select("organization_id").eq("id", studentId).single();
  const orgId = (student as { organization_id: string } | null)?.organization_id;
  if (!orgId) return false;

  const { data: org } = await supabase.from("organizations").select("settings").eq("id", orgId).single();
  const settings = (org as { settings: Record<string, boolean> | null } | null)?.settings ?? {};
  return settings[key] === true;
}

export async function requestLocationChange(
  studentId: string,
  input: { address: string; area: string; city: string; region: string; landmark: string }
): Promise<ActionResult> {
  try {
    const { supabase, parentId } = await currentParentContext();

    if (!(await verifyParentOwnsStudent(supabase, parentId, studentId))) {
      return { success: false, error: "You do not have access to this student." };
    }

    const allowed = await orgAllows(supabase, studentId, "parent_can_edit_location");
    if (!allowed) return { success: false, error: "Location changes by parents are not enabled for this organization." };

    if (!input.address && !input.area && !input.city) {
      return { success: false, error: "Enter at least an address, area, or city." };
    }

    const { error } = await supabase.from("parent_change_requests").insert({
      student_id: studentId,
      parent_id: parentId,
      request_type: "LOCATION",
      payload: input,
      status: "PENDING",
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/parent/children");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function requestPhotoChange(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, parentId } = await currentParentContext();

    const studentId = formData.get("studentId");
    const file = formData.get("file");
    if (typeof studentId !== "string" || !studentId) return { success: false, error: "Missing student." };
    if (!(file instanceof File)) return { success: false, error: "No file provided." };
    if (!ALLOWED_TYPES.has(file.type)) return { success: false, error: "Only JPG, PNG, and WebP images are supported." };
    if (file.size > MAX_UPLOAD_BYTES) return { success: false, error: "Image must be smaller than 5MB." };

    if (!(await verifyParentOwnsStudent(supabase, parentId, studentId))) {
      return { success: false, error: "You do not have access to this student." };
    }

    const allowed = await orgAllows(supabase, studentId, "parent_can_edit_photo");
    if (!allowed) return { success: false, error: "Photo changes by parents are not enabled for this organization." };

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const optimized = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();

    // Parents have no direct storage write RLS (by design — see
    // database/004_storage_policies.sql). This guarded, verified Server
    // Action is the only path that can write a pending photo on their
    // behalf, using the service-role client.
    const admin = createAdminClient();
    const path = `${studentId}/pending-${Date.now()}.jpg`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, optimized, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (uploadError) return { success: false, error: uploadError.message };

    const { error } = await supabase.from("parent_change_requests").insert({
      student_id: studentId,
      parent_id: parentId,
      request_type: "PHOTO",
      payload: { pending_path: path },
      status: "PENDING",
    });

    if (error) {
      await admin.storage.from(BUCKET).remove([path]);
      return { success: false, error: error.message };
    }

    revalidatePath("/parent/children");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function listMyChangeRequests(studentId: string): Promise<ChangeRequestRow[]> {
  const { supabase, parentId } = await currentParentContext();

  const { data } = await supabase
    .from("parent_change_requests")
    .select("id, student_id, request_type, payload, status, review_notes, created_at")
    .eq("student_id", studentId)
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false });

  type Raw = {
    id: string;
    student_id: string;
    request_type: ChangeRequestType;
    payload: Record<string, string>;
    status: ChangeRequestStatus;
    review_notes: string | null;
    created_at: string;
  };

  return ((data as Raw[]) ?? []).map((r) => ({ ...r, student_name: "", parent_name: "" }));
}

export async function listPendingChangeRequests(studentId?: string): Promise<ChangeRequestRow[]> {
  const { supabase, organizationId } = await requireAdmin();

  let query = supabase
    .from("parent_change_requests")
    .select(
      "id, student_id, request_type, payload, status, review_notes, created_at, student_profiles!inner(first_name, last_name, organization_id), parent_profiles(users(first_name, last_name))"
    )
    .eq("status", "PENDING")
    .eq("student_profiles.organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (studentId) query = query.eq("student_id", studentId);

  const { data } = await query;

  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type Raw = {
    id: string;
    student_id: string;
    request_type: ChangeRequestType;
    payload: Record<string, string>;
    status: ChangeRequestStatus;
    review_notes: string | null;
    created_at: string;
    student_profiles: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
    parent_profiles: { users: U } | { users: U }[] | null;
  };

  return ((data as Raw[]) ?? []).map((row) => {
    const student = one(row.student_profiles);
    const parent = one(one(row.parent_profiles)?.users ?? null);
    return {
      id: row.id,
      student_id: row.student_id,
      student_name: student ? `${student.first_name} ${student.last_name}` : "—",
      parent_name: parent ? `${parent.first_name} ${parent.last_name}` : "—",
      request_type: row.request_type,
      payload: row.payload,
      status: row.status,
      review_notes: row.review_notes,
      created_at: row.created_at,
    };
  });
}

export async function approveChangeRequest(id: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAdmin();

    const { data: request } = await supabase
      .from("parent_change_requests")
      .select("id, student_id, request_type, payload")
      .eq("id", id)
      .single();

    if (!request) return { success: false, error: "Request not found." };
    const r = request as { id: string; student_id: string; request_type: ChangeRequestType; payload: Record<string, string> };

    if (r.request_type === "LOCATION") {
      const now = new Date().toISOString();
      await supabase
        .from("student_locations")
        .update({ is_current: false, effective_to: now })
        .eq("student_id", r.student_id)
        .eq("is_current", true);

      const { error } = await supabase.from("student_locations").insert({
        student_id: r.student_id,
        address: r.payload.address || null,
        area: r.payload.area || null,
        city: r.payload.city || null,
        region: r.payload.region || null,
        landmark: r.payload.landmark || null,
        is_current: true,
        effective_from: now,
        created_by: userId,
      });
      if (error) return { success: false, error: error.message };
    } else {
      const pendingPath = r.payload.pending_path;
      if (!pendingPath) return { success: false, error: "No pending photo found for this request." };

      const { data: student } = await supabase
        .from("student_profiles")
        .select("passport_photo_path")
        .eq("id", r.student_id)
        .single();
      const previousPath = (student as { passport_photo_path: string | null } | null)?.passport_photo_path;

      const { error } = await supabase
        .from("student_profiles")
        .update({ passport_photo_path: pendingPath, updated_at: new Date().toISOString() })
        .eq("id", r.student_id);
      if (error) return { success: false, error: error.message };

      if (previousPath) await supabase.storage.from(BUCKET).remove([previousPath]);
    }

    const { error: updateError } = await supabase
      .from("parent_change_requests")
      .update({ status: "APPROVED", reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (updateError) return { success: false, error: updateError.message };

    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "APPROVE_CHANGE_REQUEST",
      table_name: "parent_change_requests",
      record_id: id,
      new_data: r.payload,
    });

    revalidatePath("/admin/students");
    revalidatePath(`/admin/students/${r.student_id}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function rejectChangeRequest(id: string, notes: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAdmin();

    const { data: request } = await supabase
      .from("parent_change_requests")
      .select("request_type, payload")
      .eq("id", id)
      .single();
    const r = request as { request_type: ChangeRequestType; payload: Record<string, string> } | null;

    const { error } = await supabase
      .from("parent_change_requests")
      .update({ status: "REJECTED", review_notes: notes || null, reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { success: false, error: error.message };

    if (r?.request_type === "PHOTO" && r.payload.pending_path) {
      await supabase.storage.from(BUCKET).remove([r.payload.pending_path]);
    }

    revalidatePath("/admin/students");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
