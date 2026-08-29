import { notFound } from "next/navigation";
import { getLessonNote } from "@/lib/actions/lesson-notes";
import { LessonNoteReview } from "./detail.client";

export default async function AdminLessonNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const note = await getLessonNote(id);
  if (!note || note.status === "DRAFT") notFound();

  return <LessonNoteReview note={note} />;
}
