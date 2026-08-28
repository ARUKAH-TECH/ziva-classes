import { listConversations, listMessageableContacts } from "@/lib/actions/messages";
import { MessagesPanel } from "@/app/admin/communication/messages-panel.client";

export default async function TeacherMessagesPage() {
  const [conversations, contacts] = await Promise.all([listConversations(), listMessageableContacts()]);

  return (
    <div className="space-y-6">
      <div>
        <h1>Messages</h1>
        <p className="mt-1 text-sm text-ink-500">Message the admin office or parents of your students.</p>
      </div>
      <MessagesPanel initialConversations={conversations} contacts={contacts} />
    </div>
  );
}
