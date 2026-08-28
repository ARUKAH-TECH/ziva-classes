"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveScores, type ScoreRosterEntry, type AssessmentContext } from "@/lib/actions/scores";

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

  function setScore(studentId: string, value: string) {
    const num = value === "" ? null : Number(value);
    setRoster((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, score: num } : r)));
  }

  function setComment(studentId: string, value: string) {
    setRoster((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, teacher_comment: value } : r)));
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
