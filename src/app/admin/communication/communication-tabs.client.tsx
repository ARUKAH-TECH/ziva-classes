"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnnouncementsPanel } from "./announcements-panel.client";
import { MessagesPanel } from "./messages-panel.client";
import type { AnnouncementRow } from "@/lib/actions/announcements";
import type { ConversationRow, Contact } from "@/lib/actions/messages";

export function CommunicationTabs({
  initialAnnouncements,
  initialConversations,
  contacts,
  canManageAnnouncements,
}: {
  initialAnnouncements: AnnouncementRow[];
  initialConversations: ConversationRow[];
  contacts: Contact[];
  canManageAnnouncements: boolean;
}) {
  return (
    <Tabs defaultValue="announcements">
      <TabsList>
        <TabsTrigger value="announcements">Announcements</TabsTrigger>
        <TabsTrigger value="messages">Messages</TabsTrigger>
      </TabsList>

      <TabsContent value="announcements">
        <AnnouncementsPanel initialAnnouncements={initialAnnouncements} canManage={canManageAnnouncements} />
      </TabsContent>

      <TabsContent value="messages">
        <MessagesPanel initialConversations={initialConversations} contacts={contacts} />
      </TabsContent>
    </Tabs>
  );
}
