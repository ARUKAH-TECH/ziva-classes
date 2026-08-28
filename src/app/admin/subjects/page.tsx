import { listSubjects } from "@/lib/actions/subjects";
import { SubjectsClient } from "./subjects.client";

export default async function SubjectsPage() {
  const subjects = await listSubjects();

  return (
    <div className="space-y-6">
      <div>
        <h1>Subjects</h1>
        <p className="mt-1 text-sm text-ink-500">
          Subjects offered across ZIVA — assigned to classes and taught by teachers.
        </p>
      </div>
      <SubjectsClient initialSubjects={subjects} />
    </div>
  );
}
