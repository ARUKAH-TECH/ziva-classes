import { listAssessments, listMyClassSubjects, ensureStandardAssessments } from "@/lib/actions/assessments";
import { listTerms } from "@/lib/actions/terms";
import { listAcademicYears } from "@/lib/actions/academic-years";
import { TeacherAssessmentsClient } from "./assessments.client";

export default async function TeacherAssessmentsPage() {
  const [classSubjects, years] = await Promise.all([listMyClassSubjects(), listAcademicYears()]);

  const currentYear = years.find((y) => y.is_current) ?? years[0] ?? null;
  const terms = currentYear ? await listTerms(currentYear.id) : [];
  const currentTerm = terms.find((t) => t.is_current) ?? terms[0] ?? null;

  // Auto-provision the standard Class Exercise / Homework / Quiz / Project
  // Work / Exams layout for this teacher's classes before listing, so the
  // page always shows a mark-entry row for each without them having to
  // create it by hand first.
  if (currentTerm) {
    await ensureStandardAssessments(currentTerm.id);
  }

  const assessments = await listAssessments();

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
