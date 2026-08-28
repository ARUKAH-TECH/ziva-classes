import { listAnnouncements } from "@/lib/actions/announcements";
import { listConversations, listMessageableContacts } from "@/lib/actions/messages";
import { CommunicationTabs } from "./communication-tabs.client";

export default async function AdminCommunicationPage() {
  const [announcements, conversations, contacts] = await Promise.all([
    listAnnouncements(),
    listConversations(),
    listMessageableContacts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1>Communication</h1>
        <p className="mt-1 text-sm text-ink-500">Announcements and direct messages.</p>
      </div>
      <CommunicationTabs
        initialAnnouncements={announcements}
        initialConversations={conversations}
        contacts={contacts}
        canManageAnnouncements
      />
    </div>
  );
}
