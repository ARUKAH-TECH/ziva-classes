"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { updateLessonNote, deleteLessonNote, type LessonNoteRow, type LessonNoteStatus } from "@/lib/actions/lesson-notes";
import type { MyClassSubjectOption } from "@/lib/actions/assessments";
import type { Term } from "@/lib/actions/terms";
import { LessonPlanForm } from "../lesson-plan-form.client";
import { LessonPlanTable } from "@/components/domain/lesson-plan-table";

const STATUS_BADGE: Record<LessonNoteStatus, { label: string; variant: "neutral" | "warning" | "success" | "error" }> = {
  DRAFT: { label: "Draft", variant: "neutral" },
  PENDING: { label: "Awaiting review", variant: "warning" },
  VERIFIED: { label: "Verified", variant: "success" },
  NOT_COMPLETE: { label: "Not complete", variant: "error" },
};

export function LessonNoteDetail({
  note,
  classSubjects,
  terms,
  backHref,
}: {
  note: LessonNoteRow;
  classSubjects: MyClassSubjectOption[];
  terms: Term[];
  backHref: string;
}) {
  // A draft is inherently "in progress" — land the teacher straight back
  // into the form instead of a mostly-empty read view.
  const [editing, setEditing] = useState(note.status === "DRAFT");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Lesson Notes
        </Link>
        <div className="flex gap-2">
          {note.status !== "VERIFIED" && !editing && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <DeleteButton noteId={note.id} backHref={backHref} />
            </>
          )}
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {editing ? (
        <Card>
          <CardContent>
            <LessonPlanForm
              classSubjects={classSubjects}
              terms={terms}
              submitLabel={note.status === "DRAFT" ? "Submit lesson plan" : "Save changes"}
              showDraftOption={note.status === "DRAFT"}
              onCancel={() => setEditing(false)}
              initial={{
                class_subject_id: note.class_subject_id,
                term_id: note.term_id,
                week_number: note.week_number?.toString() ?? "",
                week_ending: note.week_ending ?? "",
                day_name: note.day_name ?? "",
                lesson_date: note.lesson_date ?? "",
                strand: note.strand,
                sub_strand: note.sub_strand,
                indicator: note.indicator,
                content_standard: note.content_standard,
                performance_indicator: note.performance_indicator,
                core_competencies: note.core_competencies ?? "",
                keywords: note.keywords ?? "",
                teaching_learning_resources: note.teaching_learning_resources ?? "",
                reference: note.reference ?? "",
                phase1_starter: note.phase1_starter,
                phase2_main: note.phase2_main,
                phase3_reflection: note.phase3_reflection,
                remarks: note.remarks ?? "",
              }}
              onSubmit={async (input, draft) => {
                const result = await updateLessonNote(note.id, input, draft);
                if (result.success) window.location.reload();
                return result;
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div id="lesson-note" className="rounded-card border border-gray-300 bg-white p-6 shadow-card print:border-0 print:shadow-none">
          <div className="mb-4 flex items-start justify-between border-b-2 border-gold-500 pb-3">
            <div>
              <h1 className="font-heading text-lg font-bold text-navy-900">Weekly Lesson Plan</h1>
              <p className="text-sm text-ink-500">
                {note.subject_name} — {note.class_name} · {note.term_name}
              </p>
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
                  {note.reviewed_at
                    ? `, ${new Date(note.reviewed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
                    : ""}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DeleteButton({ noteId, backHref }: { noteId: string; backHref: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Delete this lesson plan?")) return;
        setBusy(true);
        const result = await deleteLessonNote(noteId);
        setBusy(false);
        if (result.success) {
          window.location.href = backHref;
        } else {
          alert(result.error);
        }
      }}
    >
      <Trash2 className="h-4 w-4" /> Delete
    </Button>
  );
}
