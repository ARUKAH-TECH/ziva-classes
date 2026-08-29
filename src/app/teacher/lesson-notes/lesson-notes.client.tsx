"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { submitLessonNote, type LessonNoteRow, type LessonNoteStatus } from "@/lib/actions/lesson-notes";
import type { MyClassSubjectOption } from "@/lib/actions/assessments";
import type { Term } from "@/lib/actions/terms";
import { LessonPlanForm } from "./lesson-plan-form.client";

const STATUS_BADGE: Record<LessonNoteStatus, { label: string; variant: "neutral" | "warning" | "success" | "error" }> = {
  DRAFT: { label: "Draft", variant: "neutral" },
  PENDING: { label: "Awaiting review", variant: "warning" },
  VERIFIED: { label: "Verified", variant: "success" },
  NOT_COMPLETE: { label: "Not complete", variant: "error" },
};

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export function LessonNotesClient({
  initialNotes,
  classSubjects,
  terms,
}: {
  initialNotes: LessonNoteRow[];
  classSubjects: MyClassSubjectOption[];
  terms: Term[];
}) {
  const [notes] = useState(initialNotes);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={() => setAddOpen(true)} disabled={classSubjects.length === 0}>
            <Plus className="h-4 w-4" /> Submit lesson plan
          </Button>
        </div>

        {classSubjects.length === 0 && (
          <Alert variant="warning" className="mb-4">
            You aren&apos;t assigned to any class/subject yet — ask an admin to assign you before submitting a
            lesson plan.
          </Alert>
        )}

        {notes.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title="No lesson plans yet"
            description="Submitted lesson plans will appear here, along with the admin's review status."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Week</TH>
                <TH>Week Ending</TH>
                <TH>Day</TH>
                <TH>Class</TH>
                <TH>Subject</TH>
                <TH>Strand / Sub-Strand</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {notes.map((n) => (
                <TR key={n.id}>
                  <TD>{n.week_number ?? "—"}</TD>
                  <TD>{formatDate(n.week_ending)}</TD>
                  <TD>{n.day_name ?? "—"}</TD>
                  <TD>{n.class_name}</TD>
                  <TD>{n.subject_name}</TD>
                  <TD className="font-medium text-navy-900">
                    <Link href={`/teacher/lesson-notes/${n.id}`} className="hover:underline">
                      {n.strand || n.sub_strand ? `${n.strand} — ${n.sub_strand}` : "Untitled draft"}
                    </Link>
                  </TD>
                  <TD>
                    <Badge variant={STATUS_BADGE[n.status].variant}>{STATUS_BADGE[n.status].label}</Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Submit lesson plan" className="max-w-3xl">
        <LessonPlanForm
          classSubjects={classSubjects}
          terms={terms}
          submitLabel="Submit lesson plan"
          showDraftOption
          onSubmit={async (input, draft) => {
            const result = await submitLessonNote(input, draft);
            if (result.success) window.location.reload();
            return result;
          }}
        />
      </Dialog>
    </Card>
  );
}
