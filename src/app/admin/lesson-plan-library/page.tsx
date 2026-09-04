import { listLibraryEntries } from "@/lib/actions/lesson-plan-library";
import { LessonPlanLibraryClient } from "./lesson-plan-library.client";

export default async function AdminLessonPlanLibraryPage() {
  const entries = await listLibraryEntries();

  return (
    <div className="space-y-6">
      <div>
        <h1>Lesson Plan Library</h1>
        <p className="mt-1 text-sm text-ink-500">
          GES lesson-plan content imported from the reference corpus. Approve an entry to make it available in the
          &quot;Load from reference library&quot; dropdown on the teacher Lesson Notes form — teachers never see
          anything still pending review.
        </p>
      </div>
      <LessonPlanLibraryClient entries={entries} />
    </div>
  );
}
