import { listAllLessonNotes } from "@/lib/actions/lesson-notes";
import { LessonNotesClient } from "./lesson-notes.client";

export default async function AdminLessonNotesPage() {
  const notes = await listAllLessonNotes();

  return (
    <div className="space-y-6">
      <div>
        <h1>Lesson Notes</h1>
        <p className="mt-1 text-sm text-ink-500">
          Every lesson note submitted by teachers — review, print, and mark each Verified or Not Complete.
        </p>
      </div>
      <LessonNotesClient notes={notes} />
    </div>
  );
}
