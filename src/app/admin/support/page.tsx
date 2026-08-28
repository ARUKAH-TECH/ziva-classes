import { listStudentNeeds } from "@/lib/actions/student-needs";
import { SupportClient } from "@/app/teacher/support/support.client";

export default async function AdminSupportPage() {
  const needs = await listStudentNeeds();

  return (
    <div className="space-y-6">
      <div>
        <h1>Student Support</h1>
        <p className="mt-1 text-sm text-ink-500">Educational needs and interventions identified by teachers, org-wide.</p>
      </div>
      <SupportClient initialNeeds={needs} classSubjects={[]} isAdmin />
    </div>
  );
}
