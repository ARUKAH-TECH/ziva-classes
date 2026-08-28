"use client";

import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { markNotificationRead, markAllNotificationsRead, type NotificationRow } from "@/lib/actions/notifications";

export function NotificationsList({ initialNotifications }: { initialNotifications: NotificationRow[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    await markNotificationRead(id);
  }

  async function markAll() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    await markAllNotificationsRead();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notifications</CardTitle>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAll}>
            <Check className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications yet" description="Updates about attendance, results, reports, and fees will appear here." />
        ) : (
          <ul className="divide-y divide-gray-300">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn("flex items-start justify-between gap-3 py-3", !n.read_at && "bg-royal-600/5")}
              >
                <div>
                  <p className="text-sm font-medium text-navy-900">{n.title}</p>
                  <p className="text-sm text-ink-500">{n.message}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.read_at && (
                  <button onClick={() => markRead(n.id)} className="shrink-0 text-xs text-royal-600 hover:underline">
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
