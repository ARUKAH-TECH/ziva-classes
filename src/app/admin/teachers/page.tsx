import { listTeachers } from "@/lib/actions/teachers";
import { isSuperAdmin } from "@/lib/actions/user-admin";
import { TeachersClient } from "./teachers.client";

export default async function TeachersPage() {
  const [teachers, canViewPassword] = await Promise.all([listTeachers(), isSuperAdmin()]);

  return (
    <div className="space-y-6">
      <div>
        <h1>Teachers</h1>
        <p className="mt-1 text-sm text-ink-500">
          Manage teacher accounts and their class/subject assignments.
        </p>
      </div>
      <TeachersClient initialTeachers={teachers} canViewPassword={canViewPassword} />
    </div>
  );
}
