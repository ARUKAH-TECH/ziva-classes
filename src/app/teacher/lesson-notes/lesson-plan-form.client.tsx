"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { LessonNoteInput } from "@/lib/actions/lesson-notes";
import type { MyClassSubjectOption } from "@/lib/actions/assessments";
import type { Term } from "@/lib/actions/terms";

const DAY_OPTIONS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const BLANK: LessonNoteInput = {
  class_subject_id: "",
  term_id: "",
  week_number: "",
  week_ending: "",
  day_name: "",
  lesson_date: "",
  strand: "",
  sub_strand: "",
  indicator: "",
  content_standard: "",
  performance_indicator: "",
  core_competencies: "",
  keywords: "",
  teaching_learning_resources: "",
  reference: "",
  phase1_starter: "",
  phase2_main: "",
  phase3_reflection: "",
  remarks: "",
};

// The Ghana Education Service standard weekly lesson plan fields — used for
// both submitting a new lesson note and editing an existing one.
export function LessonPlanForm({
  initial,
  classSubjects,
  terms,
  onSubmit,
  submitLabel,
  onCancel,
  showDraftOption = false,
}: {
  initial?: Partial<LessonNoteInput>;
  classSubjects: MyClassSubjectOption[];
  terms: Term[];
  onSubmit: (input: LessonNoteInput, draft: boolean) => Promise<{ success: boolean; error?: string }>;
  submitLabel: string;
  onCancel?: () => void;
  // Only makes sense before a note has ever been submitted for review (a
  // brand-new note, or one still sitting as a DRAFT) — once it's been
  // through review (NOT_COMPLETE), saving should resubmit it, not re-hide it.
  showDraftOption?: boolean;
}) {
  const currentTerm = terms.find((t) => t.is_current) ?? terms[0] ?? null;
  const [values, setValues] = useState<LessonNoteInput>({
    ...BLANK,
    class_subject_id: classSubjects[0]?.class_subject_id ?? "",
    term_id: currentTerm?.id ?? "",
    ...initial,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"submit" | "draft" | null>(null);

  function set<K extends keyof LessonNoteInput>(key: K, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("submit");
    const result = await onSubmit(values, false);
    setBusy(null);
    if (!result.success) setError(result.error ?? "Something went wrong.");
  }

  // type="button", so it never triggers the form's native required-field
  // validation — a draft is allowed to be incomplete.
  async function handleSaveDraft() {
    setError(null);
    setBusy("draft");
    const result = await onSubmit(values, true);
    setBusy(null);
    if (!result.success) setError(result.error ?? "Something went wrong.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lp-class-subject">Class &amp; Subject</Label>
          <Select
            id="lp-class-subject"
            value={values.class_subject_id}
            onChange={(e) => set("class_subject_id", e.target.value)}
            required
          >
            {classSubjects.map((cs) => (
              <option key={cs.class_subject_id} value={cs.class_subject_id}>
                {cs.subject_name} — {cs.class_name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="lp-term">Term</Label>
          <Select id="lp-term" value={values.term_id} onChange={(e) => set("term_id", e.target.value)} required>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <Label htmlFor="lp-week-number">Week №</Label>
          <Input
            id="lp-week-number"
            type="number"
            min={1}
            value={values.week_number}
            onChange={(e) => set("week_number", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="lp-week-ending">Week Ending</Label>
          <Input
            id="lp-week-ending"
            type="date"
            value={values.week_ending}
            onChange={(e) => set("week_ending", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="lp-day">Day</Label>
          <Select id="lp-day" value={values.day_name} onChange={(e) => set("day_name", e.target.value)}>
            <option value="">—</option>
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="lp-date">Date</Label>
          <Input
            id="lp-date"
            type="date"
            value={values.lesson_date}
            onChange={(e) => set("lesson_date", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lp-strand">Strand</Label>
          <Input id="lp-strand" value={values.strand} onChange={(e) => set("strand", e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="lp-sub-strand">Sub-Strand</Label>
          <Input
            id="lp-sub-strand"
            value={values.sub_strand}
            onChange={(e) => set("sub_strand", e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="lp-indicator">Indicator</Label>
        <Input
          id="lp-indicator"
          value={values.indicator}
          onChange={(e) => set("indicator", e.target.value)}
          placeholder="e.g. B4.1.1.1.1"
          required
        />
      </div>

      <div>
        <Label htmlFor="lp-content-standard">Content Standard</Label>
        <Textarea
          id="lp-content-standard"
          value={values.content_standard}
          onChange={(e) => set("content_standard", e.target.value)}
          rows={2}
          required
        />
      </div>

      <div>
        <Label htmlFor="lp-performance-indicator">Performance Indicator</Label>
        <Textarea
          id="lp-performance-indicator"
          value={values.performance_indicator}
          onChange={(e) => set("performance_indicator", e.target.value)}
          rows={2}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lp-core-competencies">Core Competencies (optional)</Label>
          <Textarea
            id="lp-core-competencies"
            value={values.core_competencies}
            onChange={(e) => set("core_competencies", e.target.value)}
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="lp-keywords">Key Words (optional)</Label>
          <Textarea id="lp-keywords" value={values.keywords} onChange={(e) => set("keywords", e.target.value)} rows={2} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lp-tlr">Teaching &amp; Learning Resource (optional)</Label>
          <Textarea
            id="lp-tlr"
            value={values.teaching_learning_resources}
            onChange={(e) => set("teaching_learning_resources", e.target.value)}
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="lp-reference">Reference (optional)</Label>
          <Textarea
            id="lp-reference"
            value={values.reference}
            onChange={(e) => set("reference", e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="lp-phase1">Phase 1 (Starter)</Label>
        <Textarea
          id="lp-phase1"
          value={values.phase1_starter}
          onChange={(e) => set("phase1_starter", e.target.value)}
          rows={3}
          required
        />
      </div>
      <div>
        <Label htmlFor="lp-phase2">Phase 2 (Main Lesson)</Label>
        <Textarea
          id="lp-phase2"
          value={values.phase2_main}
          onChange={(e) => set("phase2_main", e.target.value)}
          rows={5}
          required
        />
      </div>
      <div>
        <Label htmlFor="lp-phase3">Phase 3 (Reflection)</Label>
        <Textarea
          id="lp-phase3"
          value={values.phase3_reflection}
          onChange={(e) => set("phase3_reflection", e.target.value)}
          rows={3}
          required
        />
      </div>
      <div>
        <Label htmlFor="lp-remarks">Remarks (optional)</Label>
        <Textarea id="lp-remarks" value={values.remarks} onChange={(e) => set("remarks", e.target.value)} rows={2} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy !== null} className="flex-1">
          {busy === "submit" ? "Submitting..." : submitLabel}
        </Button>
        {showDraftOption && (
          <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={busy !== null}>
            {busy === "draft" ? "Saving..." : "Save as draft"}
          </Button>
        )}
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy !== null}>
            Cancel
          </Button>
        )}
      </div>
      {showDraftOption && (
        <p className="text-xs text-ink-500">
          Not ready yet? Save as a draft and come back to finish it later — only submitted lesson plans are visible
          to the admin.
        </p>
      )}
    </form>
  );
}
