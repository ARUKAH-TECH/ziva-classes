"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import type { LibraryListRow, LibraryReviewStatus } from "@/lib/actions/lesson-plan-library";

const STATUS_BADGE: Record<LibraryReviewStatus, { label: string; variant: "neutral" | "warning" | "success" | "error" }> = {
  PENDING_REVIEW: { label: "Pending review", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "error" },
};

export function LessonPlanLibraryClient({ entries }: { entries: LibraryListRow[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | LibraryReviewStatus>("PENDING_REVIEW");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (statusFilter !== "ALL" && e.review_status !== statusFilter) return false;
      if (!q) return true;
      return (
        e.subject_raw.toLowerCase().includes(q) ||
        (e.subject_name ?? "").toLowerCase().includes(q) ||
        e.academic_level_raw.toLowerCase().includes(q) ||
        (e.academic_level_name ?? "").toLowerCase().includes(q) ||
        (e.topic ?? "").toLowerCase().includes(q) ||
        e.source_file_path.toLowerCase().includes(q)
      );
    });
  }, [entries, query, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<LibraryReviewStatus, number> = { PENDING_REVIEW: 0, APPROVED: 0, REJECTED: 0 };
    for (const e of entries) c[e.review_status]++;
    return c;
  }, [entries]);

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search by subject, class, topic, or file…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | LibraryReviewStatus)}
            className="w-auto"
          >
            <option value="ALL">All statuses ({entries.length})</option>
            <option value="PENDING_REVIEW">Pending review ({counts.PENDING_REVIEW})</option>
            <option value="APPROVED">Approved ({counts.APPROVED})</option>
            <option value="REJECTED">Rejected ({counts.REJECTED})</option>
          </Select>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No library entries yet"
            description="Run the import script (scripts/import-lesson-plan-library.mjs) to populate the reference library."
          />
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">No entries match your filters.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Term</TH>
                <TH>Class</TH>
                <TH>Subject</TH>
                <TH>Week</TH>
                <TH>Topic</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((e) => (
                <TR key={e.id}>
                  <TD>Term {e.term_number}</TD>
                  <TD>{e.academic_level_name ?? <span className="text-ink-400">{e.academic_level_raw} (unmatched)</span>}</TD>
                  <TD>{e.subject_name ?? <span className="text-ink-400">{e.subject_raw} (unmatched)</span>}</TD>
                  <TD>{e.week_number ?? "—"}</TD>
                  <TD className="font-medium text-navy-900">
                    <Link href={`/admin/lesson-plan-library/${e.id}`} className="hover:underline">
                      {e.topic || e.source_file_path}
                    </Link>
                  </TD>
                  <TD>
                    <Badge variant={STATUS_BADGE[e.review_status].variant}>{STATUS_BADGE[e.review_status].label}</Badge>
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
