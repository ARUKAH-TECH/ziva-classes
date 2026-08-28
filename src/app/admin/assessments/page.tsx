import { listAssessments } from "@/lib/actions/assessments";
import { listScheduleOptions } from "@/lib/actions/schedules";
import { listTerms } from "@/lib/actions/terms";
import { listAcademicYears } from "@/lib/actions/academic-years";
import { AdminAssessmentsClient } from "./assessments.client";

export default async function AdminAssessmentsPage() {
  const [assessments, options, years] = await Promise.all([
    listAssessments(),
    listScheduleOptions(),
    listAcademicYears(),
  ]);

  const currentYear = years.find((y) => y.is_current) ?? years[0] ?? null;
  const terms = currentYear ? await listTerms(currentYear.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1>Assessments</h1>
        <p className="mt-1 text-sm text-ink-500">Assessments across every class, subject, and teacher.</p>
      </div>
      <AdminAssessmentsClient initialAssessments={assessments} options={options} terms={terms} />
    </div>
  );
}
