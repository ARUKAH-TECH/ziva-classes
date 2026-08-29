import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getStudent, getStudentCurrentEnrollment } from "@/lib/actions/students";
import { getStudentPhotoUrl } from "@/lib/actions/student-photo";
import { listStudentLocations } from "@/lib/actions/student-location";
import {
  listStudentSubjects,
  listAvailableClassSubjectsForStudent,
} from "@/lib/actions/student-subjects";
import { listStudentParents } from "@/lib/actions/student-parents";
import { listParents } from "@/lib/actions/parents";
import { getStudentAttendanceSummary } from "@/lib/actions/attendance";
import { getStudentPerformanceSummary } from "@/lib/actions/scores";
import { listStudentCharges, listApplicableFeeStructuresForStudent } from "@/lib/actions/charges";
import { listPayments } from "@/lib/actions/payments";
import { listPendingChangeRequests } from "@/lib/actions/change-requests";
import { listClasses } from "@/lib/actions/classes";
import { listAcademicYears } from "@/lib/actions/academic-years";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/domain/student-avatar";
import { ResetPasswordButton } from "@/components/domain/reset-password-button.client";
import { ViewPasswordButton } from "@/components/domain/view-password-button.client";
import { isSuperAdmin } from "@/lib/actions/user-admin";
import { StudentDetailTabs } from "./detail-tabs.client";
import { DeleteStudentButton } from "./delete-student-button.client";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const student = await getStudent(id);
  if (!student) notFound();

  const enrollment = await getStudentCurrentEnrollment(id);

  const [
    photoUrl,
    locations,
    studentSubjects,
    availableClassSubjects,
    studentParents,
    allParents,
    attendance,
    performance,
    charges,
    payments,
    classes,
    years,
    applicableFeeStructures,
    canViewPassword,
  ] = await Promise.all([
    getStudentPhotoUrl(student.passport_photo_path),
    listStudentLocations(id),
    enrollment ? listStudentSubjects(id, enrollment.academic_year_id) : Promise.resolve([]),
    enrollment ? listAvailableClassSubjectsForStudent(enrollment.class_id) : Promise.resolve([]),
    listStudentParents(id),
    listParents(),
    getStudentAttendanceSummary(id),
    getStudentPerformanceSummary(id),
    listStudentCharges(id),
    listPayments(id),
    listClasses(),
    listAcademicYears(),
    listApplicableFeeStructuresForStudent(id),
    isSuperAdmin(),
  ]);

  const currentYear = years.find((y) => y.is_current) ?? years[0] ?? null;

  const linkedParentIds = new Set(studentParents.map((p) => p.parent_id));
  const linkableParents = allParents.filter((p) => !linkedParentIds.has(p.id));

  const pendingRequests = await listPendingChangeRequests(id);
  const locationRequests = pendingRequests.filter((r) => r.request_type === "LOCATION");
  const photoRequestsRaw = pendingRequests.filter((r) => r.request_type === "PHOTO");
  const photoRequests = await Promise.all(
    photoRequestsRaw.map(async (r) => ({
      ...r,
      preview_url: await getStudentPhotoUrl(r.payload.pending_path ?? null),
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/students"
          className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-navy-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to students
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <StudentAvatar url={photoUrl} name={`${student.first_name} ${student.last_name}`} size={56} />
            <div>
              <div className="flex items-center gap-3">
                <h1>
                  {student.first_name} {student.last_name}
                </h1>
                <Badge variant={student.status === "ACTIVE" ? "success" : "neutral"}>{student.status}</Badge>
              </div>
              <p className="mt-0.5 text-sm text-ink-500">
                {student.student_number} {enrollment && `· ${enrollment.class_name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {student.optional_user_id && <ResetPasswordButton userId={student.optional_user_id} />}
            {student.optional_user_id && canViewPassword && (
              <ViewPasswordButton userId={student.optional_user_id} />
            )}
            <DeleteStudentButton
              studentId={student.id}
              fullName={`${student.first_name} ${student.last_name}`}
            />
          </div>
        </div>
      </div>

      <StudentDetailTabs
        student={student}
        photoUrl={photoUrl}
        enrollment={enrollment}
        attendance={attendance}
        performance={performance}
        locations={locations}
        studentSubjects={studentSubjects}
        availableClassSubjects={availableClassSubjects}
        studentParents={studentParents}
        linkableParents={linkableParents}
        charges={charges}
        payments={payments}
        applicableFeeStructures={applicableFeeStructures}
        locationRequests={locationRequests}
        photoRequests={photoRequests}
        classes={classes}
        currentYear={currentYear}
        canViewPassword={canViewPassword}
      />
    </div>
  );
}
