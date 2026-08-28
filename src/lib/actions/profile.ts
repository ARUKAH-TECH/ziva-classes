"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/auth/require-admin";

// Shared by every role's own Profile page. RLS's users_self_update policy
// (id = auth.uid()) is what actually allows this — teacher_profiles and
// parent_profiles have no self-update policy, so phone (on users) is the
// only field a teacher/parent can edit about themselves today.
export async function updateMyPhone(phone: string, revalidatePathAfter: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "You must be signed in." };

    const { error } = await supabase
      .from("users")
      .update({ phone: phone || null })
      .eq("id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath(revalidatePathAfter);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
