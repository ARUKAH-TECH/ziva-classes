import { listMyNotifications } from "@/lib/actions/notifications";
import { NotificationsList } from "@/components/domain/notifications-list.client";

export default async function StudentNotificationsPage() {
  const notifications = await listMyNotifications();
  return (
    <div className="space-y-6">
      <div>
        <h1>Notifications</h1>
      </div>
      <NotificationsList initialNotifications={notifications} />
    </div>
  );
}
