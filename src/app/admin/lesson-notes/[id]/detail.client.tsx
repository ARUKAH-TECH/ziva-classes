"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { reviewLessonNote, type LessonNoteRow, type LessonNoteStatus } from "@/lib/actions/lesson-notes";
import { LessonPlanTable } from "@/components/domain/lesson-plan-table";

const STATUS_BADGE: Record<LessonNoteStatus, { label: string; variant: "neutral" | "warning" | "success" | "error" }> = {
  DRAFT: { label: "Draft", variant: "neutral" },
  PENDING: { label: "Awaiting review", variant: "warning" },
  VERIFIED: { label: "Verified", variant: "success" },
  NOT_COMPLETE: { label: "Not complete", variant: "error" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function LessonNoteReview({ note }: { note: LessonNoteRow }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/admin/lesson-notes" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Lesson Notes
        </Link>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print
        </Button>
      </div>

      <div id="lesson-note" className="rounded-card border border-gray-300 bg-white p-6 shadow-card print:border-0 print:shadow-none">
        <div className="mb-4 flex items-start justify-between border-b-2 border-gold-500 pb-3">
          <div>
            <h1 className="font-heading text-lg font-bold text-navy-900">Weekly Lesson Plan</h1>
            <p className="text-sm text-ink-500">
              {note.teacher_name} · {note.subject_name} — {note.class_name} · {note.term_name}
            </p>
            <p className="text-xs text-ink-400">Submitted {formatDate(note.submitted_at)}</p>
          </div>
          <Badge variant={STATUS_BADGE[note.status].variant}>{STATUS_BADGE[note.status].label}</Badge>
        </div>

        <LessonPlanTable note={note} />

        {note.admin_comment && (
          <div className="mt-4 rounded border border-gray-300 bg-surface p-3 print:break-inside-avoid">
            <h2 className="mb-1 text-sm font-semibold text-navy-900">Admin&apos;s Comment</h2>
            <p className="whitespace-pre-wrap text-sm text-ink-700">{note.admin_comment}</p>
            {note.reviewed_by_name && (
              <p className="mt-1 text-xs text-ink-500">
                — {note.reviewed_by_name}
                {note.reviewed_at ? `, ${formatDate(note.reviewed_at)}` : ""}
              </p>
            )}
          </div>
        )}
      </div>

      <ReviewPanel note={note} />
    </div>
  );
}

function ReviewPanel({ note }: { note: LessonNoteRow }) {
  const [comment, setComment] = useState(note.admin_comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<LessonNoteStatus | null>(null);

  async function review(status: "VERIFIED" | "NOT_COMPLETE") {
    setError(null);
    setBusy(status);
    const result = await reviewLessonNote(note.id, { status, admin_comment: comment });
    setBusy(null);
    if (result.success) window.location.reload();
    else setError(result.error);
  }

  return (
    <Card className="print:hidden">
      <CardContent>
        <h2 className="mb-3 text-sm font-semibold text-navy-900">Review this lesson plan</h2>
        {error && (
          <Alert variant="error" className="mb-3">
            {error}
          </Alert>
        )}
        <div className="mb-3">
          <Label htmlFor="ln-admin-comment">Correction / comment (optional)</Label>
          <Textarea
            id="ln-admin-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Anything the teacher should fix or add..."
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => review("VERIFIED")} disabled={busy !== null}>
            <CheckCircle2 className="h-4 w-4" /> {busy === "VERIFIED" ? "Saving..." : "Mark Verified"}
          </Button>
          <Button variant="secondary" onClick={() => review("NOT_COMPLETE")} disabled={busy !== null}>
            <XCircle className="h-4 w-4" /> {busy === "NOT_COMPLETE" ? "Saving..." : "Mark Not Complete"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
