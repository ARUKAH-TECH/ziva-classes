"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import type { LessonNoteRow, LessonNoteStatus } from "@/lib/actions/lesson-notes";

const STATUS_BADGE: Record<LessonNoteStatus, { label: string; variant: "neutral" | "warning" | "success" | "error" }> = {
  DRAFT: { label: "Draft", variant: "neutral" },
  PENDING: { label: "Awaiting review", variant: "warning" },
  VERIFIED: { label: "Verified", variant: "success" },
  NOT_COMPLETE: { label: "Not complete", variant: "error" },
};

export function LessonNotesClient({ notes }: { notes: LessonNoteRow[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | LessonNoteStatus>("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (statusFilter !== "ALL" && n.status !== statusFilter) return false;
      if (!q) return true;
      return (
        n.teacher_name.toLowerCase().includes(q) ||
        n.strand.toLowerCase().includes(q) ||
        n.sub_strand.toLowerCase().includes(q) ||
        n.subject_name.toLowerCase().includes(q) ||
        n.class_name.toLowerCase().includes(q)
      );
    });
  }, [notes, query, statusFilter]);

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-3">
          <Input
            placeholder="Search by teacher, strand, class, or subject…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | LessonNoteStatus)}
            className="w-auto"
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Awaiting review</option>
            <option value="VERIFIED">Verified</option>
            <option value="NOT_COMPLETE">Not complete</option>
          </Select>
        </div>

        {notes.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title="No lesson notes submitted yet"
            description="Notes teachers submit from their portal will appear here for review."
          />
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">No lesson notes match your filters.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Submitted</TH>
                <TH>Week</TH>
                <TH>Teacher</TH>
                <TH>Class</TH>
                <TH>Subject</TH>
                <TH>Strand / Sub-Strand</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((n) => (
                <TR key={n.id}>
                  <TD>{new Date(n.submitted_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</TD>
                  <TD>{n.week_number ?? "—"}</TD>
                  <TD>{n.teacher_name}</TD>
                  <TD>{n.class_name}</TD>
                  <TD>{n.subject_name}</TD>
                  <TD className="font-medium text-navy-900">
                    <Link href={`/admin/lesson-notes/${n.id}`} className="hover:underline">
                      {n.strand} — {n.sub_strand}
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
    </Card>
  );
}
