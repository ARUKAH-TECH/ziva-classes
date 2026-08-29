"use client";

import { useMemo, useState } from "react";
import { MessageSquareWarning, CheckCircle2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  respondToTeacherFeedback,
  type TeacherFeedbackRow,
  type TeacherFeedbackStatus,
} from "@/lib/actions/teacher-feedback";

const STATUS_BADGE: Record<TeacherFeedbackStatus, { label: string; variant: "warning" | "royal" | "success" }> = {
  NEW: { label: "New", variant: "warning" },
  ACKNOWLEDGED: { label: "Acknowledged", variant: "royal" },
  RESOLVED: { label: "Resolved", variant: "success" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function TeacherFeedbackClient({ feedback }: { feedback: TeacherFeedbackRow[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TeacherFeedbackStatus>("ALL");
  const [changeOnly, setChangeOnly] = useState(false);
  const [selected, setSelected] = useState<TeacherFeedbackRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return feedback.filter((f) => {
      if (statusFilter !== "ALL" && f.status !== statusFilter) return false;
      if (changeOnly && !f.request_teacher_change) return false;
      if (!q) return true;
      return (
        f.teacher_name.toLowerCase().includes(q) ||
        f.parent_name.toLowerCase().includes(q) ||
        f.student_name.toLowerCase().includes(q)
      );
    });
  }, [feedback, query, statusFilter, changeOnly]);

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-3">
          <Input
            placeholder="Search by teacher, parent, or child…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | TeacherFeedbackStatus)} className="w-auto">
            <option value="ALL">All statuses</option>
            <option value="NEW">New</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </Select>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={changeOnly} onChange={(e) => setChangeOnly(e.target.checked)} />
            Change requests only
          </label>
        </div>

        {feedback.length === 0 ? (
          <EmptyState
            icon={MessageSquareWarning}
            title="No feedback submitted yet"
            description="Feedback parents share about teachers will appear here."
          />
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">No feedback matches your filters.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-200">
            {filtered.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelected(f)}
                className="flex flex-wrap items-start justify-between gap-3 py-3 text-left hover:bg-surface"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-navy-900">{f.teacher_name}</span>
                    <span className="text-xs text-ink-500">
                      from {f.parent_name} · re: {f.student_name}
                    </span>
                    {f.request_teacher_change && <Badge variant="error">Change requested</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-700">{f.message}</p>
                  <p className="mt-1 text-xs text-ink-400">{formatDate(f.created_at)}</p>
                </div>
                <Badge variant={STATUS_BADGE[f.status].variant}>{STATUS_BADGE[f.status].label}</Badge>
              </button>
            ))}
          </div>
        )}
      </CardContent>

      {selected && <ReviewDialog feedback={selected} onClose={() => setSelected(null)} />}
    </Card>
  );
}

function ReviewDialog({ feedback, onClose }: { feedback: TeacherFeedbackRow; onClose: () => void }) {
  const [response, setResponse] = useState(feedback.admin_response ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<TeacherFeedbackStatus | null>(null);

  async function respond(status: "ACKNOWLEDGED" | "RESOLVED") {
    setError(null);
    setBusy(status);
    const result = await respondToTeacherFeedback(feedback.id, { status, admin_response: response });
    setBusy(null);
    if (result.success) window.location.reload();
    else setError(result.error);
  }

  return (
    <Dialog open onClose={onClose} title={`Feedback for ${feedback.teacher_name}`} className="max-w-xl">
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-500">
            From {feedback.parent_name} · re: {feedback.student_name} · {formatDate(feedback.created_at)}
          </span>
          {feedback.request_teacher_change && <Badge variant="error">Change requested</Badge>}
          <Badge variant={STATUS_BADGE[feedback.status].variant}>{STATUS_BADGE[feedback.status].label}</Badge>
        </div>

        <p className="whitespace-pre-wrap rounded border border-gray-300 bg-surface p-3 text-sm text-ink-700">
          {feedback.message}
        </p>

        <div>
          <Label htmlFor="tf-response">Response to parent (optional)</Label>
          <Textarea id="tf-response" value={response} onChange={(e) => setResponse(e.target.value)} rows={3} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => respond("ACKNOWLEDGED")} disabled={busy !== null}>
            <MailCheck className="h-4 w-4" /> {busy === "ACKNOWLEDGED" ? "Saving..." : "Acknowledge"}
          </Button>
          <Button variant="secondary" onClick={() => respond("RESOLVED")} disabled={busy !== null}>
            <CheckCircle2 className="h-4 w-4" /> {busy === "RESOLVED" ? "Saving..." : "Mark Resolved"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
