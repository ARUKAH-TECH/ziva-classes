import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { renderToBuffer } from "@react-pdf/renderer";
import { getFullReport } from "@/lib/actions/terminal-reports";
import { getStudentPhotoUrl } from "@/lib/actions/student-photo";
import { getOrgBranding } from "@/lib/actions/organization";
import { TerminalReportPDF } from "@/lib/reports/report-pdf";

export const runtime = "nodejs";

let cachedLogoDataUri: string | null = null;

async function getLogoDataUri(): Promise<string> {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  const filePath = path.join(process.cwd(), "public", "images", "ziva-logo-original.jpg");
  const buffer = await readFile(filePath);
  cachedLogoDataUri = `data:image/jpeg;base64,${buffer.toString("base64")}`;
  return cachedLogoDataUri;
}

async function toDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

// Access control here is entirely RLS-backed via getFullReport's underlying
// query — an unauthorized caller simply gets "report not found" (RLS makes
// the row invisible to them), same as everywhere else in this app.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // getFullReport's query is RLS-scoped: a parent/student cannot even see a
  // non-PUBLISHED row (terminal_reports_parent_view / _student_view require
  // status='PUBLISHED'), so reaching a non-null result here for a DRAFT
  // report already implies the caller is an authorized admin.
  const report = await getFullReport(id);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const [photoUrl, branding, logoDataUri] = await Promise.all([
    getStudentPhotoUrl(report.payload.student.passport_photo_path),
    getOrgBranding(),
    getLogoDataUri(),
  ]);

  const photoDataUri = await toDataUri(photoUrl);

  const buffer = await renderToBuffer(
    <TerminalReportPDF
      payload={report.payload}
      status={report.status}
      version={report.version}
      administratorComment={report.administrator_comment}
      overallTeacherComment={report.teacher_comment}
      photoDataUri={photoDataUri}
      logoDataUri={logoDataUri}
      orgName={branding?.name ?? "ZIVA Online & Special Classes"}
      orgMotto={branding?.motto ?? "Excellence Our Hallmark"}
    />
  );

  const filename = `Terminal-Report-${report.payload.student.first_name}-${report.payload.student.last_name}-${report.payload.term_name}.pdf`.replace(
    /\s+/g,
    "-"
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
