import { notFound } from "next/navigation";
import { getFullReport } from "@/lib/actions/terminal-reports";
import { getStudentPhotoUrl } from "@/lib/actions/student-photo";
import { getOrgBranding } from "@/lib/actions/organization";
import { ReportViewer } from "@/components/domain/report-viewer.client";

export default async function StudentReportViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const report = await getFullReport(id);
  if (!report || report.status !== "PUBLISHED") notFound();

  const [photoUrl, branding] = await Promise.all([
    getStudentPhotoUrl(report.payload.student.passport_photo_path),
    getOrgBranding(),
  ]);

  return (
    <ReportViewer
      report={report}
      photoUrl={photoUrl}
      orgName={branding?.name ?? "ZIVA Online & Special Classes"}
      orgMotto={branding?.motto ?? "Excellence Our Hallmark"}
      backHref="/student/terminal-reports"
    />
  );
}
