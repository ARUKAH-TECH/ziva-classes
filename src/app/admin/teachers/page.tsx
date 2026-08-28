import { listTeachers } from "@/lib/actions/teachers";
import { TeachersClient } from "./teachers.client";

export default async function TeachersPage() {
  const teachers = await listTeachers();

  return (
    <div className="space-y-6">
      <div>
        <h1>Teachers</h1>
        <p className="mt-1 text-sm text-ink-500">
          Manage teacher accounts and their class/subject assignments.
        </p>
      </div>
      <TeachersClient initialTeachers={teachers} />
    </div>
  );
}
