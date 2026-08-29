import { listMyChildren } from "@/lib/actions/parent-children";
import { listMyTeacherFeedback } from "@/lib/actions/teacher-feedback";
import { TeacherFeedbackClient } from "./teacher-feedback.client";

export default async function ParentTeacherFeedbackPage() {
  const [myChildren, feedback] = await Promise.all([listMyChildren(), listMyTeacherFeedback()]);

  return (
    <div className="space-y-6">
      <div>
        <h1>Feedback on Teachers</h1>
        <p className="mt-1 text-sm text-ink-500">
          Share your views or suggestions about a teacher directly with the admin — or request a change of teacher
          if necessary.
        </p>
      </div>
      <TeacherFeedbackClient myChildren={myChildren} initialFeedback={feedback} />
    </div>
  );
}
