import { listAllTeacherFeedback } from "@/lib/actions/teacher-feedback";
import { TeacherFeedbackClient } from "./teacher-feedback.client";

export default async function AdminTeacherFeedbackPage() {
  const feedback = await listAllTeacherFeedback();

  return (
    <div className="space-y-6">
      <div>
        <h1>Parent Feedback</h1>
        <p className="mt-1 text-sm text-ink-500">
          Views, suggestions, and teacher-change requests shared by parents.
        </p>
      </div>
      <TeacherFeedbackClient feedback={feedback} />
    </div>
  );
}
