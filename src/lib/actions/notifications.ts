"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/notifications";

export interface NotificationRow {
  id: string;
  title: string;
  message: string;
  notification_type: NotificationType | null;
  read_at: string | null;
  created_at: string;
}

// RLS (notifications_self) already restricts this to the caller's own rows.
export async function listMyNotifications(): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("notifications")
    .select("id, title, message, notification_type, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (data as NotificationRow[]) ?? [];
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/parent/notifications");
    revalidatePath("/student/notifications");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not signed in." };

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (error) return { success: false, error: error.message };

    revalidatePath("/parent/notifications");
    revalidatePath("/student/notifications");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
