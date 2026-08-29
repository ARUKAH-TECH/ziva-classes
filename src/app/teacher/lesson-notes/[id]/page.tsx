import { notFound } from "next/navigation";
import { getLessonNote } from "@/lib/actions/lesson-notes";
import { listMyClassSubjects } from "@/lib/actions/assessments";
import { listAcademicYears } from "@/lib/actions/academic-years";
import { listTerms } from "@/lib/actions/terms";
import { LessonNoteDetail } from "./detail.client";

export default async function TeacherLessonNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const note = await getLessonNote(id);
  if (!note) notFound();

  const [classSubjects, years] = await Promise.all([listMyClassSubjects(), listAcademicYears()]);
  const currentYear = years.find((y) => y.is_current) ?? years[0] ?? null;
  const terms = currentYear ? await listTerms(currentYear.id) : [];

  return <LessonNoteDetail note={note} classSubjects={classSubjects} terms={terms} backHref="/teacher/lesson-notes" />;
}
