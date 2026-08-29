import { notFound } from "next/navigation";
import { getFullReport, listReportHistory } from "@/lib/actions/terminal-reports";
import { getStudentPhotoUrl } from "@/lib/actions/student-photo";
import { getOrgBranding } from "@/lib/actions/organization";
import { ReportViewer } from "@/components/domain/report-viewer.client";

export default async function ParentReportViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const report = await getFullReport(id);
  if (!report || report.status !== "PUBLISHED") notFound();

  const [photoUrl, branding, history] = await Promise.all([
    getStudentPhotoUrl(report.payload.student.passport_photo_path),
    getOrgBranding(),
    listReportHistory(report.payload.student.id),
  ]);

  return (
    <ReportViewer
      report={report}
      photoUrl={photoUrl}
      orgName={branding?.name ?? "ZIVA Online & Special Classes"}
      orgMotto={branding?.motto ?? "Excellence Our Hallmark"}
      backHref="/parent/terminal-reports"
      history={history}
    />
  );
}
