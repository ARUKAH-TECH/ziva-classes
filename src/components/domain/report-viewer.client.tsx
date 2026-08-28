"use client";

import Link from "next/link";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TerminalReportView } from "@/components/domain/terminal-report-view";
import type { FullReport } from "@/lib/actions/terminal-reports";

export function ReportViewer({
  report,
  photoUrl,
  orgName,
  orgMotto,
  backHref,
}: {
  report: FullReport;
  photoUrl: string | null;
  orgName: string;
  orgMotto: string;
  backHref: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex gap-2">
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
    </div>
  );
}
