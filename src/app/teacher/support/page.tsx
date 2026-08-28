import { listStudentNeeds } from "@/lib/actions/student-needs";
import { listMyClassSubjects } from "@/lib/actions/assessments";
import { SupportClient } from "./support.client";

export default async function TeacherSupportPage() {
  const [needs, classSubjects] = await Promise.all([listStudentNeeds(), listMyClassSubjects()]);

  // Students available to flag: everyone enrolled in the teacher's own
  // class/subjects — mirrors the roster used for attendance/scores.
  return (
    <div className="space-y-6">
      <div>
        <h1>Student Support</h1>
        <p className="mt-1 text-sm text-ink-500">Identify learning needs and track interventions for your students.</p>
      </div>
      <SupportClient initialNeeds={needs} classSubjects={classSubjects} isAdmin={false} />
    </div>
  );
}
