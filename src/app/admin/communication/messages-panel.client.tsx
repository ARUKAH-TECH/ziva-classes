"use client";

import { useEffect, useState } from "react";
import { Plus, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { listThread, sendMessage, type ConversationRow, type Contact, type MessageRow } from "@/lib/actions/messages";

export function MessagesPanel({
  initialConversations,
  contacts,
}: {
  initialConversations: ConversationRow[];
  contacts: Contact[];
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selected, setSelected] = useState<string | null>(conversations[0]?.other_user_id ?? null);
  const [composeOpen, setComposeOpen] = useState(false);

  async function refresh() {
    // simplest correct approach: full reload picks up new conversations too
    window.location.reload();
  }

  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <div className="mb-2 flex justify-end">
            <Button size="sm" onClick={() => setComposeOpen(true)} disabled={contacts.length === 0}>
              <Plus className="h-4 w-4" /> New
            </Button>
          </div>
          {conversations.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No conversations yet" description="Start a new message." />
          ) : (
            <ul className="divide-y divide-gray-300 rounded border border-gray-300">
              {conversations.map((c) => (
                <li key={c.other_user_id}>
                  <button
                    onClick={() => setSelected(c.other_user_id)}
                    className={cn(
                      "w-full px-3 py-2.5 text-left text-sm hover:bg-surface",
                      selected === c.other_user_id && "bg-surface"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-navy-900">{c.other_name}</span>
                      {c.unread_count > 0 && <Badge variant="royal">{c.unread_count}</Badge>}
                    </div>
                    <p className="truncate text-xs text-ink-500">{c.last_message}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="md:col-span-2">
          {selected ? (
            <Thread
              otherUserId={selected}
              otherName={conversations.find((c) => c.other_user_id === selected)?.other_name ?? "—"}
            />
          ) : (
            <EmptyState icon={MessageSquare} title="Select a conversation" description="Choose a conversation on the left, or start a new one." />
          )}
        </div>
      </CardContent>

      {composeOpen && (
        <ComposeDialog
          contacts={contacts}
          onClose={() => setComposeOpen(false)}
          onSent={(userId) => {
            setComposeOpen(false);
            setSelected(userId);
            refresh();
          }}
        />
      )}
    </Card>
  );
}

function Thread({ otherUserId, otherName }: { otherUserId: string; otherName: string }) {
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setMessages(await listThread(otherUserId));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId]);

  async function send() {
    if (!reply.trim()) return;
    setBusy(true);
    const result = await sendMessage(otherUserId, "", reply);
    setBusy(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    setReply("");
    await load();
  }

  return (
    <div className="flex h-[420px] flex-col rounded border border-gray-300">
      <div className="border-b border-gray-300 px-3 py-2 text-sm font-medium text-navy-900">{otherName}</div>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {messages === null ? (
          <p className="text-sm text-ink-500">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-ink-500">No messages yet — say hello.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("max-w-[75%] rounded px-3 py-1.5 text-sm", m.is_mine ? "ml-auto bg-royal-600 text-white" : "bg-surface text-navy-900")}>
              {m.message}
              <div className={cn("mt-0.5 text-[10px]", m.is_mine ? "text-white/70" : "text-ink-500")}>
                {new Date(m.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2 border-t border-gray-300 p-2">
        <Input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <Button size="sm" onClick={send} disabled={busy} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ComposeDialog({
  contacts,
  onClose,
  onSent,
}: {
  contacts: Contact[];
  onClose: () => void;
  onSent: (userId: string) => void;
}) {
  const [receiverId, setReceiverId] = useState(contacts[0]?.user_id ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await sendMessage(receiverId, "", message);
    setBusy(false);
    if (result.success) onSent(receiverId);
    else setError(result.error);
  }

  return (
    <Dialog open onClose={onClose} title="New message">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <Label htmlFor="msg-to">To</Label>
          <Select id="msg-to" value={receiverId} onChange={(e) => setReceiverId(e.target.value)}>
            {contacts.map((c) => (
              <option key={c.user_id} value={c.user_id}>
                {c.name} ({c.role})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="msg-body">Message</Label>
          <Textarea id="msg-body" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Sending..." : "Send"}
        </Button>
      </form>
    </Dialog>
  );
}
