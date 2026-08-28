"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Download, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";
import { TerminalReportView } from "@/components/domain/terminal-report-view";
import {
  publishReport,
  unpublishReport,
  updateReportComments,
  generateReport,
  type FullReport,
} from "@/lib/actions/terminal-reports";

export function ReportDetailClient({
  report,
  photoUrl,
  orgName,
  orgMotto,
}: {
  report: FullReport;
  photoUrl: string | null;
  orgName: string;
  orgMotto: string;
}) {
  const [busy, setBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    if (!confirm("Publish this report? It will become visible to the parent and student, and further edits will require unpublishing first.")) return;
    setBusy(true);
    setError(null);
    const result = await publishReport(report.id);
    setBusy(false);
    if (result.success) window.location.reload();
    else setError(result.error);
  }

  async function handleUnpublish() {
    if (!confirm("Unpublish this report? It will no longer be visible to the parent or student until re-published.")) return;
    setBusy(true);
    setError(null);
    const result = await unpublishReport(report.id);
    setBusy(false);
    if (result.success) window.location.reload();
    else setError(result.error);
  }

  async function handleRegenerate() {
    setBusy(true);
    setError(null);
    const result = await generateReport(report.payload.student.id, report.payload.term_id, report.payload.ranking_enabled);
    setBusy(false);
    if (result.success) window.location.reload();
    else setError(result.error);
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/admin/terminal-reports"
          className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-navy-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Terminal Reports
        </Link>

        <div className="flex flex-wrap gap-2">
          {report.status === "DRAFT" && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setCommentsOpen(true)}>
                <Pencil className="h-4 w-4" /> Edit comments
              </Button>
              <Button variant="secondary" size="sm" onClick={handleRegenerate} disabled={busy}>
                <RefreshCw className="h-4 w-4" /> Regenerate
              </Button>
              <Button size="sm" onClick={handlePublish} disabled={busy}>
                Publish
              </Button>
            </>
          )}
          {report.status === "PUBLISHED" && (
            <Button variant="secondary" size="sm" onClick={handleUnpublish} disabled={busy}>
              Unpublish
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <a href={`/api/terminal-reports/${report.id}/pdf`} target="_blank" rel="noreferrer">
            <Button size="sm" variant="secondary">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </a>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="no-print">
          {error}
        </Alert>
      )}

      <div className="rounded-card border border-gray-300 shadow-card print:border-0 print:shadow-none">
        <TerminalReportView
          payload={report.payload}
          status={report.status}
          version={report.version}
          administratorComment={report.administrator_comment}
          overallTeacherComment={report.teacher_comment}
          photoUrl={photoUrl}
          orgName={orgName}
          orgMotto={orgMotto}
        />
      </div>

      {commentsOpen && (
        <EditCommentsDialog
          reportId={report.id}
          initialAdmin={report.administrator_comment ?? ""}
          initialTeacher={report.teacher_comment ?? ""}
          onClose={() => setCommentsOpen(false)}
        />
      )}
    </div>
  );
}

function EditCommentsDialog({
  reportId,
  initialAdmin,
  initialTeacher,
  onClose,
}: {
  reportId: string;
  initialAdmin: string;
  initialTeacher: string;
  onClose: () => void;
}) {
  const [adminComment, setAdminComment] = useState(initialAdmin);
  const [teacherComment, setTeacherComment] = useState(initialTeacher);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    const result = await updateReportComments(reportId, {
      administrator_comment: adminComment,
      teacher_comment: teacherComment,
    });
    setBusy(false);
    if (result.success) window.location.reload();
    else setError(result.error);
  }

  return (
    <Dialog open onClose={onClose} title="Edit report comments">
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <Label htmlFor="overall-teacher-comment">Overall teacher comment</Label>
          <Textarea
            id="overall-teacher-comment"
            value={teacherComment}
            onChange={(e) => setTeacherComment(e.target.value)}
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="admin-comment">Administrator&apos;s comment</Label>
          <Textarea id="admin-comment" value={adminComment} onChange={(e) => setAdminComment(e.target.value)} rows={3} />
        </div>
        <Button onClick={save} disabled={busy} className="w-full">
          {busy ? "Saving..." : "Save comments"}
        </Button>
      </div>
    </Dialog>
  );
}
