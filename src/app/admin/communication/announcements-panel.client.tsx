"use client";

import { useState } from "react";
import { Plus, Megaphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { createAnnouncement, deleteAnnouncement, type AnnouncementRow } from "@/lib/actions/announcements";

export function AnnouncementsPanel({
  initialAnnouncements,
  canManage,
}: {
  initialAnnouncements: AnnouncementRow[];
  canManage: boolean;
}) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Card>
      <CardContent>
        {canManage && (
          <div className="mb-4 flex justify-end">
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> New announcement
            </Button>
          </div>
        )}

        {announcements.length === 0 ? (
          <EmptyState icon={Megaphone} title="No announcements yet" description="Post an organization-wide announcement." />
        ) : (
          <ul className="space-y-3">
            {announcements.map((a) => (
              <li key={a.id} className="rounded border border-gray-300 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-navy-900">{a.title}</p>
                    <p className="mt-1 text-sm text-ink-500">{a.message}</p>
                    <p className="mt-1 text-xs text-ink-500">
                      {a.created_by_name ?? "—"} · {a.published_at ? new Date(a.published_at).toLocaleString() : "—"}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      aria-label="Delete announcement"
                      onClick={async () => {
                        if (!confirm(`Delete "${a.title}"?`)) return;
                        const result = await deleteAnnouncement(a.id);
                        if (result.success) setAnnouncements((prev) => prev.filter((x) => x.id !== a.id));
                        else alert(result.error);
                      }}
                      className="rounded p-1 text-ink-500 hover:bg-gray-100 hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {addOpen && <AddAnnouncementDialog onClose={() => setAddOpen(false)} />}
    </Card>
  );
}

function AddAnnouncementDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await createAnnouncement({ title, message });
    setBusy(false);
    if (result.success) window.location.reload();
    else setError(result.error);
  }

  return (
    <Dialog open onClose={onClose} title="New announcement">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <Label htmlFor="ann-title">Title</Label>
          <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="ann-message">Message</Label>
          <Textarea id="ann-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Publishing..." : "Publish announcement"}
        </Button>
      </form>
    </Dialog>
  );
}
