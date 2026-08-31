"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveScores, type ScoreRosterEntry, type AssessmentContext } from "@/lib/actions/scores";
import { parsePastedSheet, matchRosterRow, type ImportField } from "@/lib/bulk-import/parse";

const PASTE_FIELDS: ImportField[] = [
  { key: "student", label: "Student", required: true },
  { key: "score", label: "Score", required: true },
  { key: "comment", label: "Comment" },
];

export function EnterScores({
  assessment,
  initialRoster,
  backHref,
}: {
  assessment: AssessmentContext;
  initialRoster: ScoreRosterEntry[];
  backHref: string;
}) {
  const [roster, setRoster] = useState(initialRoster);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteResult, setPasteResult] = useState<{ matched: number; unmatched: string[] } | null>(null);

  function setScore(studentId: string, value: string) {
    const num = value === "" ? null : Number(value);
    setRoster((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, score: num } : r)));
  }

  function setComment(studentId: string, value: string) {
    setRoster((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, teacher_comment: value } : r)));
  }

  function applyPaste() {
    const parsed = parsePastedSheet<{ student: string; score: string; comment: string }>(pasteText, PASTE_FIELDS);
    const unmatched: string[] = [];
    let matched = 0;

    setRoster((prev) => {
      const next = [...prev];
      for (const row of parsed.rows) {
        if (!row.student.trim()) continue;
        const entry = matchRosterRow(next, row.student);
        if (!entry) {
          unmatched.push(row.student);
          continue;
        }
        const num = Number(row.score.trim());
        if (row.score.trim() === "" || Number.isNaN(num) || num < 0 || num > assessment.maximum_score) {
          unmatched.push(`${row.student} (score "${row.score}" invalid — must be 0-${assessment.maximum_score})`);
          continue;
        }
        const idx = next.findIndex((r) => r.student_id === entry.student_id);
        next[idx] = { ...next[idx], score: num, teacher_comment: row.comment.trim() || next[idx].teacher_comment };
        matched++;
      }
      return next;
    });

    setPasteResult({ matched, unmatched });
  }

  async function save() {
    setError(null);
    const invalid = roster.some(
      (r) => r.score !== null && (r.score < 0 || r.score > assessment.maximum_score)
    );
    if (invalid) {
      setError(`Scores must be between 0 and ${assessment.maximum_score}.`);
      return;
    }

    setSaving(true);
    const result = await saveScores(
      assessment.id,
      assessment.academic_level_id,
      assessment.maximum_score,
      roster
        .filter((r) => r.score !== null)
        .map((r) => ({ student_id: r.student_id, score: r.score as number, teacher_comment: r.teacher_comment ?? "" }))
    );
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  const entered = roster.filter((r) => r.score !== null).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href={backHref} className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1>{assessment.name}</h1>
        <p className="mt-1 text-sm text-ink-500">
          {assessment.subject_name} — {assessment.class_name} · Max score: {assessment.maximum_score}
          {!assessment.academic_level_id && (
            <Badge variant="warning" className="ml-2">
              No grading scale configured for this level — scores save without a letter grade
            </Badge>
          )}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Paste from spreadsheet</CardTitle>
          <Button type="button" variant="secondary" size="sm" onClick={() => setPasteOpen((v) => !v)}>
            {pasteOpen ? "Hide" : "Paste scores"}
          </Button>
        </CardHeader>
        {pasteOpen && (
          <CardContent className="space-y-3">
            <p className="text-sm text-ink-500">
              Columns: Student (name or Student ID), Score (0-{assessment.maximum_score}), Comment (optional).
            </p>
            <Textarea
              rows={6}
              placeholder={"Student\tScore\tComment\nAkosua Boateng\t14\t\nKwame Osei\t11\tGood effort"}
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setPasteResult(null);
              }}
            />
            <Button type="button" variant="secondary" onClick={applyPaste} disabled={!pasteText.trim()}>
              Fill roster from paste
            </Button>
            {pasteResult && (
              <Alert variant={pasteResult.unmatched.length > 0 ? "warning" : "success"}>
                {pasteResult.matched} row{pasteResult.matched === 1 ? "" : "s"} applied.
                {pasteResult.unmatched.length > 0 && ` Not matched: ${pasteResult.unmatched.join(", ")}`}
              </Alert>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Scores</CardTitle>
          <span className="text-sm text-ink-500">
            {entered}/{roster.length} entered
          </span>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded border border-error/30 bg-red-50 px-3 py-2 text-sm text-error">{error}</p>
          )}

          {roster.length === 0 ? (
            <p className="text-sm text-ink-500">No students are enrolled in this subject.</p>
          ) : (
            <ul className="divide-y divide-gray-300">
              {roster.map((r) => (
                <li key={r.student_id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="min-w-[160px] font-medium text-navy-900">
                    {r.first_name} {r.last_name}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    max={assessment.maximum_score}
                    value={r.score ?? ""}
                    onChange={(e) => setScore(r.student_id, e.target.value)}
                    className="w-24"
                    placeholder="Score"
                  />
                  <span className="text-sm text-ink-500">/ {assessment.maximum_score}</span>
                  {r.grade && <Badge variant="royal">{r.grade}</Badge>}
                  <Input
                    value={r.teacher_comment ?? ""}
                    onChange={(e) => setComment(r.student_id, e.target.value)}
                    placeholder="Comment (optional)"
                    className="min-w-[200px] flex-1"
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving || roster.length === 0}>
          {saving ? "Saving..." : "Save scores"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-success">
            <Check className="h-4 w-4" /> Saved — grades computed from the class&apos;s grading scale
          </span>
        )}
      </div>
    </div>
  );
}
