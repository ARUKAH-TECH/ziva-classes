"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "student-photos";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB raw upload cap
const MAX_DIMENSION = 800; // px, longest edge — plenty for print/screen passport use
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

// Resolves a short-lived signed URL for a photo path. Uses the caller's own
// session (not the service-role admin client) — Supabase Storage enforces
// database/004_storage_policies.sql for signed-URL creation too, so an
// unauthorized caller (e.g. a teacher requesting an unrelated student's
// photo) is rejected by RLS here, not by application logic.
export async function getStudentPhotoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 15);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function uploadStudentPhoto(formData: FormData): Promise<ActionResult<{ path: string }>> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const studentId = formData.get("studentId");
    const file = formData.get("file");

    if (typeof studentId !== "string" || !studentId) {
      return { success: false, error: "Missing student." };
    }
    if (!(file instanceof File)) {
      return { success: false, error: "No file provided." };
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return { success: false, error: "Only JPG, PNG, and WebP images are supported." };
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { success: false, error: "Image must be smaller than 5MB." };
    }

    // Confirm the student belongs to this admin's organization before touching storage.
    const { data: student } = await supabase
      .from("student_profiles")
      .select("id, passport_photo_path")
      .eq("id", studentId)
      .eq("organization_id", organizationId)
      .single();

    if (!student) {
      return { success: false, error: "Student not found." };
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const optimized = await sharp(inputBuffer)
      .rotate() // respect EXIF orientation before stripping it
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();

    const path = `${studentId}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, optimized, { contentType: "image/jpeg", upsert: false });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const previousPath = (student as { passport_photo_path: string | null }).passport_photo_path;

    const { error: updateError } = await supabase
      .from("student_profiles")
      .update({ passport_photo_path: path, updated_at: new Date().toISOString() })
      .eq("id", studentId);

    if (updateError) {
      await supabase.storage.from(BUCKET).remove([path]);
      return { success: false, error: updateError.message };
    }

    if (previousPath) {
      await supabase.storage.from(BUCKET).remove([previousPath]);
    }

    revalidatePath(`/admin/students/${studentId}`);
    revalidatePath("/admin/students");
    return { success: true, data: { path } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function removeStudentPhoto(studentId: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await requireAdmin();

    const { data: student } = await supabase
      .from("student_profiles")
      .select("passport_photo_path")
      .eq("id", studentId)
      .eq("organization_id", organizationId)
      .single();

    const path = (student as { passport_photo_path: string | null } | null)?.passport_photo_path;

    const { error } = await supabase
      .from("student_profiles")
      .update({ passport_photo_path: null, updated_at: new Date().toISOString() })
      .eq("id", studentId)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };

    if (path) await supabase.storage.from(BUCKET).remove([path]);

    revalidatePath(`/admin/students/${studentId}`);
    revalidatePath("/admin/students");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
