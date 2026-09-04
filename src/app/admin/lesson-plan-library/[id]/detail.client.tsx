"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  updateLibraryEntry,
  reviewLibraryEntry,
  getLibrarySourceUrl,
  type LibraryEntryDetail,
  type LibraryReviewStatus,
} from "@/lib/actions/lesson-plan-library";
import { listAcademicLevels, type AcademicLevel } from "@/lib/actions/academic-levels";
import { listSubjects, type Subject } from "@/lib/actions/subjects";

const STATUS_BADGE: Record<LibraryReviewStatus, { label: string; variant: "neutral" | "warning" | "success" | "error" }> = {
  PENDING_REVIEW: { label: "Pending review", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "error" },
};

export function LibraryEntryReview({ entry: initial }: { entry: LibraryEntryDetail }) {
  const [entry, setEntry] = useState(initial);
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | LibraryReviewStatus | null>(null);

  useEffect(() => {
    listAcademicLevels().then(setLevels);
    listSubjects().then(setSubjects);
    if (entry.storage_path) getLibrarySourceUrl(entry.storage_path).then(setSourceUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof LibraryEntryDetail>(key: K, val: LibraryEntryDetail[K]) {
    setEntry((prev) => ({ ...prev, [key]: val }));
  }

  async function save() {
    setError(null);
    setBusy("save");
    const result = await updateLibraryEntry(entry.id, {
      academic_level_id: entry.academic_level_id,
      subject_id: entry.subject_id,
      academic_level_raw: entry.academic_level_raw,
      subject_raw: entry.subject_raw,
      week_number: entry.week_number,
      topic: entry.topic,
      strand: entry.strand,
      sub_strand: entry.sub_strand,
      indicator: entry.indicator,
      content_standard: entry.content_standard,
      performance_indicator: entry.performance_indicator,
      core_competencies: entry.core_competencies,
      keywords: entry.keywords,
      teaching_learning_resources: entry.teaching_learning_resources,
      reference: entry.reference,
      phase1_starter: entry.phase1_starter,
      phase2_main: entry.phase2_main,
      phase3_reflection: entry.phase3_reflection,
      remarks: entry.remarks,
    });
    setBusy(null);
    if (!result.success) setError(result.error);
  }

  async function review(status: LibraryReviewStatus) {
    setError(null);
    setBusy(status);
    await save();
    const result = await reviewLibraryEntry(entry.id, status);
    setBusy(null);
    if (result.success) set("review_status", status);
    else setError(result.error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/lesson-plan-library"
          className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-navy-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Lesson Plan Library
        </Link>
        <Badge variant={STATUS_BADGE[entry.review_status].variant}>{STATUS_BADGE[entry.review_status].label}</Badge>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-navy-900">Source</h2>
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-navy-700 hover:underline"
              >
                View original document <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <p className="text-xs text-ink-500">
            Term {entry.term_number} · extracted from a document at import time — this record can be edited freely
            without affecting the original file.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="lpl-level">Class / Academic Level</Label>
              <Select
                id="lpl-level"
                value={entry.academic_level_id ?? ""}
                onChange={(e) => set("academic_level_id", e.target.value || null)}
              >
                <option value="">— Unmatched ({entry.academic_level_raw}) —</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="lpl-subject">Subject</Label>
              <Select
                id="lpl-subject"
                value={entry.subject_id ?? ""}
                onChange={(e) => set("subject_id", e.target.value || null)}
              >
                <option value="">— Unmatched ({entry.subject_raw}) —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="lpl-week">Week №</Label>
              <Input
                id="lpl-week"
                type="number"
                min={1}
                value={entry.week_number ?? ""}
                onChange={(e) => set("week_number", e.target.value ? parseInt(e.target.value, 10) : null)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="lpl-topic">Topic (shown in the teacher dropdown)</Label>
              <Input id="lpl-topic" value={entry.topic ?? ""} onChange={(e) => set("topic", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="lpl-strand">Strand</Label>
              <Input id="lpl-strand" value={entry.strand ?? ""} onChange={(e) => set("strand", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="lpl-sub-strand">Sub-Strand</Label>
              <Input
                id="lpl-sub-strand"
                value={entry.sub_strand ?? ""}
                onChange={(e) => set("sub_strand", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="lpl-indicator">Indicator</Label>
            <Input id="lpl-indicator" value={entry.indicator ?? ""} onChange={(e) => set("indicator", e.target.value)} />
          </div>

          <div>
            <Label htmlFor="lpl-content-standard">Content Standard</Label>
            <Textarea
              id="lpl-content-standard"
              value={entry.content_standard ?? ""}
              onChange={(e) => set("content_standard", e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="lpl-performance-indicator">Performance Indicator</Label>
            <Textarea
              id="lpl-performance-indicator"
              value={entry.performance_indicator ?? ""}
              onChange={(e) => set("performance_indicator", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="lpl-core-competencies">Core Competencies</Label>
              <Textarea
                id="lpl-core-competencies"
                value={entry.core_competencies ?? ""}
                onChange={(e) => set("core_competencies", e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="lpl-keywords">Key Words</Label>
              <Textarea
                id="lpl-keywords"
                value={entry.keywords ?? ""}
                onChange={(e) => set("keywords", e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="lpl-tlr">Teaching &amp; Learning Resource</Label>
              <Textarea
                id="lpl-tlr"
                value={entry.teaching_learning_resources ?? ""}
                onChange={(e) => set("teaching_learning_resources", e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="lpl-reference">Reference</Label>
              <Textarea
                id="lpl-reference"
                value={entry.reference ?? ""}
                onChange={(e) => set("reference", e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="lpl-phase1">Phase 1 (Starter)</Label>
            <Textarea
              id="lpl-phase1"
              value={entry.phase1_starter ?? ""}
              onChange={(e) => set("phase1_starter", e.target.value)}
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="lpl-phase2">Phase 2 (Main Lesson)</Label>
            <Textarea
              id="lpl-phase2"
              value={entry.phase2_main ?? ""}
              onChange={(e) => set("phase2_main", e.target.value)}
              rows={6}
            />
          </div>
          <div>
            <Label htmlFor="lpl-phase3">Phase 3 (Reflection)</Label>
            <Textarea
              id="lpl-phase3"
              value={entry.phase3_reflection ?? ""}
              onChange={(e) => set("phase3_reflection", e.target.value)}
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="lpl-remarks">Remarks</Label>
            <Textarea id="lpl-remarks" value={entry.remarks ?? ""} onChange={(e) => set("remarks", e.target.value)} rows={2} />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="secondary" onClick={save} disabled={busy !== null}>
              {busy === "save" ? "Saving..." : "Save changes"}
            </Button>
            <Button onClick={() => review("APPROVED")} disabled={busy !== null}>
              <CheckCircle2 className="h-4 w-4" /> {busy === "APPROVED" ? "Saving..." : "Approve"}
            </Button>
            <Button variant="secondary" onClick={() => review("REJECTED")} disabled={busy !== null}>
              <XCircle className="h-4 w-4" /> {busy === "REJECTED" ? "Saving..." : "Reject"}
            </Button>
          </div>
          <p className="text-xs text-ink-500">
            Approving saves your edits first, then makes this entry selectable by teachers whose class/subject/term
            match it. Rejecting keeps it out of the teacher dropdown permanently (it stays here for reference).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
