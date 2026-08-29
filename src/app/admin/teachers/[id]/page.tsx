import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTeacher } from "@/lib/actions/teachers";
import { listTeacherAssignments, listAssignableClassSubjects } from "@/lib/actions/teacher-assignments";
import { listAcademicYears } from "@/lib/actions/academic-years";
import { Badge } from "@/components/ui/badge";
import { ResetPasswordButton } from "@/components/domain/reset-password-button.client";
import { ViewPasswordButton } from "@/components/domain/view-password-button.client";
import { isSuperAdmin } from "@/lib/actions/user-admin";
import { TeacherAssignmentsClient } from "./assignments.client";
import { TeacherProfileCard } from "./profile-card.client";
import { DeleteTeacherButton } from "./delete-teacher-button.client";

export default async function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [teacher, assignments, assignable, years, canViewPassword] = await Promise.all([
    getTeacher(id),
    listTeacherAssignments(id),
    listAssignableClassSubjects(),
    listAcademicYears(),
    isSuperAdmin(),
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1>
              {teacher.first_name} {teacher.last_name}
            </h1>
            <Badge variant={teacher.is_active ? "success" : "neutral"}>
              {teacher.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <ResetPasswordButton userId={teacher.user_id} />
            {canViewPassword && <ViewPasswordButton userId={teacher.user_id} />}
            <DeleteTeacherButton
              userId={teacher.user_id}
              fullName={`${teacher.first_name} ${teacher.last_name}`}
            />
          </div>
        </div>
      </div>

      <TeacherProfileCard teacher={teacher} />

      <TeacherAssignmentsClient
        teacherId={id}
        initialAssignments={assignments}
        assignable={assignable}
        years={years}
      />
    </div>
  );
}
