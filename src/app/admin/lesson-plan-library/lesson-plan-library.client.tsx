"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { approveAllPendingInTerm, type LibraryListRow, type LibraryReviewStatus } from "@/lib/actions/lesson-plan-library";

const STATUS_BADGE: Record<LibraryReviewStatus, { label: string; variant: "neutral" | "warning" | "success" | "error" }> = {
  PENDING_REVIEW: { label: "Pending review", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "error" },
};

export function LessonPlanLibraryClient({ entries }: { entries: LibraryListRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | LibraryReviewStatus>("PENDING_REVIEW");
  const [approvingTerm, setApprovingTerm] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Grouped by term so an admin can approve an entire term — every subject
  // and class in it — with one click, instead of one entry at a time.
  const termGroups = useMemo(() => {
    const byTerm = new Map<number, LibraryListRow[]>();
    for (const e of filtered) {
      const group = byTerm.get(e.term_number) ?? [];
      group.push(e);
      byTerm.set(e.term_number, group);
    }
    return [...byTerm.entries()].sort(([a], [b]) => a - b);
  }, [filtered]);

  const pendingCountByTerm = useMemo(() => {
    const c = new Map<number, number>();
    for (const e of entries) {
      if (e.review_status !== "PENDING_REVIEW") continue;
      c.set(e.term_number, (c.get(e.term_number) ?? 0) + 1);
    }
    return c;
  }, [entries]);

  async function handleApproveTerm(termNumber: number) {
    setError(null);
    setApprovingTerm(termNumber);
    const result = await approveAllPendingInTerm(termNumber);
    setApprovingTerm(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

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

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {entries.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No library entries yet"
            description="Run the import script (scripts/import-lesson-plan-library.mjs) to populate the reference library."
          />
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">No entries match your filters.</p>
        ) : (
          <div className="space-y-6">
            {termGroups.map(([termNumber, rows]) => {
              const pending = pendingCountByTerm.get(termNumber) ?? 0;
              return (
                <div key={termNumber}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-card bg-gray-50 px-3 py-2">
                    <h2 className="text-sm font-semibold text-navy-900">
                      Term {termNumber}{" "}
                      <span className="font-normal text-ink-500">
                        ({rows.length} shown{pending > 0 ? `, ${pending} pending across all subjects & classes` : ""})
                      </span>
                    </h2>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleApproveTerm(termNumber)}
                      disabled={pending === 0 || approvingTerm === termNumber}
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      {approvingTerm === termNumber
                        ? "Approving…"
                        : pending === 0
                          ? "Nothing pending"
                          : `Approve all ${pending} pending in Term ${termNumber}`}
                    </Button>
                  </div>
                  <Table>
                    <THead>
                      <TR>
                        <TH>Class</TH>
                        <TH>Subject</TH>
                        <TH>Week</TH>
                        <TH>Topic</TH>
                        <TH>Status</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {rows.map((e) => (
                        <TR key={e.id}>
                          <TD>
                            {e.academic_level_name ?? <span className="text-ink-400">{e.academic_level_raw} (unmatched)</span>}
                          </TD>
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
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
