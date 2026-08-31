import { listMyLessonNotes } from "@/lib/actions/lesson-notes";
import { listMyClassSubjects } from "@/lib/actions/assessments";
import { listAcademicYears } from "@/lib/actions/academic-years";
import { listTerms } from "@/lib/actions/terms";
import { getMyOrgSettings } from "@/lib/actions/organization";
import { Alert } from "@/components/ui/alert";
import { LessonNotesClient } from "./lesson-notes.client";

export default async function TeacherLessonNotesPage() {
  const [notes, classSubjects, years, orgSettings] = await Promise.all([
    listMyLessonNotes(),
    listMyClassSubjects(),
    listAcademicYears(),
    getMyOrgSettings(),
  ]);

  const currentYear = years.find((y) => y.is_current) ?? years[0] ?? null;
  const terms = currentYear ? await listTerms(currentYear.id) : [];

  const deadline = orgSettings.lesson_note_deadline ? new Date(orgSettings.lesson_note_deadline) : null;
  const isOverdue = deadline !== null && deadline.getTime() < Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1>Lesson Notes</h1>
        <p className="mt-1 text-sm text-ink-500">
          Submit your lesson notes here — the admin reviews and marks each one Verified or Not Complete.
        </p>
      </div>
      {deadline && (
        <Alert variant={isOverdue ? "error" : "warning"}>
          {isOverdue ? "Submission deadline has passed — " : "Submit by "}
          {deadline.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.
        </Alert>
      )}
      <LessonNotesClient initialNotes={notes} classSubjects={classSubjects} terms={terms} />
    </div>
  );
}
