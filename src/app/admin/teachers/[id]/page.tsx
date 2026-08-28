import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTeacher } from "@/lib/actions/teachers";
import { listTeacherAssignments, listAssignableClassSubjects } from "@/lib/actions/teacher-assignments";
import { listAcademicYears } from "@/lib/actions/academic-years";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TeacherAssignmentsClient } from "./assignments.client";

export default async function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [teacher, assignments, assignable, years] = await Promise.all([
    getTeacher(id),
    listTeacherAssignments(id),
    listAssignableClassSubjects(),
    listAcademicYears(),
  ]);

  if (!teacher) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/teachers"
          className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-navy-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to teachers
        </Link>
        <div className="flex items-center gap-3">
          <h1>
            {teacher.first_name} {teacher.last_name}
          </h1>
          <Badge variant={teacher.is_active ? "success" : "neutral"}>
            {teacher.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 py-5 sm:grid-cols-3">
          <Field label="Email" value={teacher.email ?? "—"} />
          <Field label="Phone" value={teacher.phone ?? "—"} />
          <Field label="Employee number" value={teacher.employee_number ?? "—"} />
          <Field label="Qualification" value={teacher.qualification ?? "—"} />
          <Field label="Specialization" value={teacher.specialization ?? "—"} />
        </CardContent>
      </Card>

      <TeacherAssignmentsClient
        teacherId={id}
        initialAssignments={assignments}
        assignable={assignable}
        years={years}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm text-navy-900">{value}</p>
    </div>
  );
}
