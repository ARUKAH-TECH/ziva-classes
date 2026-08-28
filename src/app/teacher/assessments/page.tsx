import { listAssessments, listMyClassSubjects } from "@/lib/actions/assessments";
import { listTerms } from "@/lib/actions/terms";
import { listAcademicYears } from "@/lib/actions/academic-years";
import { TeacherAssessmentsClient } from "./assessments.client";

export default async function TeacherAssessmentsPage() {
  const [assessments, classSubjects, years] = await Promise.all([
    listAssessments(),
    listMyClassSubjects(),
    listAcademicYears(),
  ]);

  const currentYear = years.find((y) => y.is_current) ?? years[0] ?? null;
  const terms = currentYear ? await listTerms(currentYear.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1>Assessments</h1>
        <p className="mt-1 text-sm text-ink-500">Assignments, quizzes, tests, exams, and projects you&apos;ve set.</p>
      </div>
      <TeacherAssessmentsClient initialAssessments={assessments} classSubjects={classSubjects} terms={terms} />
    </div>
  );
}
