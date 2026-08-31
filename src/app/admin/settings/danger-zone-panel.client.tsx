"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resetForNewClient, type ResetSummary } from "@/lib/actions/reset-organization";
import { RESET_CONFIRMATION_PHRASE } from "@/lib/reset-confirmation";

export function DangerZonePanel() {
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ResetSummary | null>(null);

  const phraseMatches = confirmation.trim() === RESET_CONFIRMATION_PHRASE;

  async function handleReset() {
    if (!phraseMatches) return;
    const confirmed = window.confirm(
      "This permanently deletes every Student, Parent, Teacher, and regular Admin — along with their fees, payments, attendance, scores, lesson notes, and terminal reports. Classes, Subjects, Fee pricing, and Grading stay. This cannot be undone. Continue?"
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    setSummary(null);
    const result = await resetForNewClient(confirmation);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSummary(result.data);
    setConfirmation("");
  }

  return (
    <Card className="max-w-2xl border-error/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-error">
          <AlertTriangle className="h-5 w-5" /> Reset for New Client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert variant="warning">
          This is permanent — there is no undo. Make sure you actually want to do this before typing the
          confirmation phrase below.
        </Alert>

        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="font-semibold text-error">Deleted</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-ink-500">
              <li>All Students (and their logins)</li>
              <li>All Parents (and their logins)</li>
              <li>All Teachers (and their logins)</li>
              <li>All regular Admin accounts</li>
              <li>Fees, charges, and payments</li>
              <li>Attendance, scores, terminal reports</li>
              <li>Lesson notes and timetable slots</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-success">Kept</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-ink-500">
              <li>Your Super Admin login</li>
              <li>Classes and Subjects</li>
              <li>Academic Levels/Years/Terms and level codes</li>
              <li>Fee pricing rules (not actual bills)</li>
              <li>Grading scales and all Settings</li>
            </ul>
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {summary && (
          <Alert variant="success">
            Done — deleted {summary.studentsDeleted} student{summary.studentsDeleted === 1 ? "" : "s"},{" "}
            {summary.parentsDeleted} parent{summary.parentsDeleted === 1 ? "" : "s"}, {summary.teachersDeleted}{" "}
            teacher{summary.teachersDeleted === 1 ? "" : "s"}, {summary.adminsDeleted} admin
            {summary.adminsDeleted === 1 ? "" : "s"}.
            {summary.loginFailures > 0 &&
              ` ${summary.loginFailures} login account${summary.loginFailures === 1 ? "" : "s"} couldn't be removed — check manually.`}
          </Alert>
        )}

        <div>
          <Label htmlFor="reset-confirmation">
            Type <span className="font-mono font-semibold">{RESET_CONFIRMATION_PHRASE}</span> to enable the button
          </Label>
          <Input
            id="reset-confirmation"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={RESET_CONFIRMATION_PHRASE}
            autoComplete="off"
          />
        </div>

        <Button type="button" variant="danger" onClick={handleReset} disabled={!phraseMatches || busy}>
          {busy ? "Deleting..." : "Reset for New Client"}
        </Button>
      </CardContent>
    </Card>
  );
}
