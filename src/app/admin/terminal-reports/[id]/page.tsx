import { notFound } from "next/navigation";
import { getFullReport } from "@/lib/actions/terminal-reports";
import { getStudentPhotoUrl } from "@/lib/actions/student-photo";
import { getOrgBranding } from "@/lib/actions/organization";
import { ReportDetailClient } from "./report-detail.client";

export default async function AdminReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const report = await getFullReport(id);
  if (!report) notFound();

  const [photoUrl, branding] = await Promise.all([
    getStudentPhotoUrl(report.payload.student.passport_photo_path),
    getOrgBranding(),
  ]);

  return (
    <ReportDetailClient
      report={report}
      photoUrl={photoUrl}
      orgName={branding?.name ?? "ZIVA Online & Special Classes"}
      orgMotto={branding?.motto ?? "Excellence Our Hallmark"}
    />
  );
}
