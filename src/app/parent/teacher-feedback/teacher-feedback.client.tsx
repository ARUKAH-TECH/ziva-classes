"use client";

import { useEffect, useState } from "react";
import { MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  submitTeacherFeedback,
  listTeachersForChild,
  type TeacherFeedbackRow,
  type TeacherFeedbackStatus,
  type StudentTeacherOption,
} from "@/lib/actions/teacher-feedback";
import type { MyChildRow } from "@/lib/actions/parent-children";

const STATUS_BADGE: Record<TeacherFeedbackStatus, { label: string; variant: "warning" | "royal" | "success" }> = {
  NEW: { label: "Submitted", variant: "warning" },
  ACKNOWLEDGED: { label: "Acknowledged", variant: "royal" },
  RESOLVED: { label: "Resolved", variant: "success" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function TeacherFeedbackClient({
  myChildren,
  initialFeedback,
}: {
  myChildren: MyChildRow[];
  initialFeedback: TeacherFeedbackRow[];
}) {
  return (
    <div className="space-y-6">
      <SubmitForm myChildren={myChildren} />

      <Card>
        <CardHeader>
          <CardTitle>Your submitted feedback</CardTitle>
        </CardHeader>
        <CardContent>
          {initialFeedback.length === 0 ? (
            <EmptyState
              icon={MessageSquareWarning}
              title="Nothing submitted yet"
              description="Feedback you share about a teacher will appear here, along with the admin's response."
            />
          ) : (
            <div className="flex flex-col divide-y divide-gray-200">
              {initialFeedback.map((f) => (
                <div key={f.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-navy-900">{f.teacher_name}</span>
                    <span className="text-xs text-ink-500">for {f.student_name}</span>
                    {f.request_teacher_change && <Badge variant="error">Change requested</Badge>}
                    <Badge variant={STATUS_BADGE[f.status].variant}>{STATUS_BADGE[f.status].label}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-400">{formatDate(f.created_at)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{f.message}</p>
                  {f.admin_response && (
                    <div className="mt-2 rounded border border-gray-300 bg-surface p-2">
                      <p className="text-xs font-semibold text-navy-900">Admin&apos;s response</p>
                      <p className="whitespace-pre-wrap text-sm text-ink-700">{f.admin_response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SubmitForm({ myChildren }: { myChildren: MyChildRow[] }) {
  const [studentId, setStudentId] = useState(myChildren[0]?.id ?? "");
  const [teacherOptions, setTeacherOptions] = useState<StudentTeacherOption[] | null>(null);
  const [teacherId, setTeacherId] = useState("");
  const [message, setMessage] = useState("");
  const [requestChange, setRequestChange] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTeacherOptions(null);
    setTeacherId("");
    if (!studentId) return;
    listTeachersForChild(studentId).then((options) => {
      if (!cancelled) {
        setTeacherOptions(options);
        setTeacherId(options[0]?.teacher_id ?? "");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setBusy(true);
    const result = await submitTeacherFeedback({
      student_id: studentId,
      teacher_id: teacherId,
      message,
      request_teacher_change: requestChange,
    });
    setBusy(false);
    if (result.success) {
      setMessage("");
      setRequestChange(false);
      setSuccess(true);
      window.location.reload();
    } else {
      setError(result.error);
    }
  }

  if (myChildren.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={MessageSquareWarning}
            title="No children linked"
            description="Link a child to your account to share feedback about their teachers."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share feedback about a teacher</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">Thank you — your feedback has been sent to the admin.</Alert>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tf-child">Child</Label>
              <Select id="tf-child" value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
                {myChildren.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="tf-teacher">Teacher</Label>
              {teacherOptions === null ? (
                <p className="text-xs text-ink-400">Loading teachers…</p>
              ) : teacherOptions.length === 0 ? (
                <p className="text-xs text-ink-400">This child has no assigned teachers yet.</p>
              ) : (
                <Select id="tf-teacher" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} required>
                  {teacherOptions.map((t) => (
                    <option key={`${t.teacher_id}|${t.subject_name}`} value={t.teacher_id}>
                      {t.teacher_name} ({t.subject_name})
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="tf-message">Your feedback</Label>
            <Textarea
              id="tf-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Share your views or suggestions..."
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={requestChange} onChange={(e) => setRequestChange(e.target.checked)} />
            Request a change of teacher
          </label>

          <Button type="submit" disabled={busy || !teacherId} className="w-full">
            {busy ? "Sending..." : "Send to admin"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
