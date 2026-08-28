"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export interface StudentLocation {
  id: string;
  address: string | null;
  area: string | null;
  city: string | null;
  region: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  is_current: boolean;
  effective_from: string;
  effective_to: string | null;
}

// Read-only, shared by admin/teacher/parent — RLS (locations_admin_manage
// / locations_teacher_view / locations_parent_view) scopes visibility per
// role; this just needs a signed-in session.
export async function listStudentLocations(studentId: string): Promise<StudentLocation[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("student_locations")
    .select("id, address, area, city, region, landmark, latitude, longitude, is_current, effective_from, effective_to")
    .eq("student_id", studentId)
    .order("effective_from", { ascending: false });

  return (data as StudentLocation[]) ?? [];
}

// Never overwrites history (Rule 9/10): the previous current row is closed
// out (is_current=false, effective_to=now) and a new row is inserted.
export async function addStudentLocation(
  studentId: string,
  input: {
    address: string;
    area: string;
    city: string;
    region: string;
    landmark: string;
    latitude: string;
    longitude: string;
  }
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAdmin();

    if (!input.address && !input.area && !input.city) {
      return { success: false, error: "Enter at least an address, area, or city." };
    }

    const now = new Date().toISOString();

    await supabase
      .from("student_locations")
      .update({ is_current: false, effective_to: now })
      .eq("student_id", studentId)
      .eq("is_current", true);

    const { error } = await supabase.from("student_locations").insert({
      student_id: studentId,
      address: input.address || null,
      area: input.area || null,
      city: input.city || null,
      region: input.region || null,
      landmark: input.landmark || null,
      latitude: input.latitude ? parseFloat(input.latitude) : null,
      longitude: input.longitude ? parseFloat(input.longitude) : null,
      is_current: true,
      effective_from: now,
      created_by: userId,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/admin/students/${studentId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
