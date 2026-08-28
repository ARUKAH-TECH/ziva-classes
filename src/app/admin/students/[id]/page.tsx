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
import { listStudentCharges } from "@/lib/actions/charges";
import { listPayments } from "@/lib/actions/payments";
import { listPendingChangeRequests } from "@/lib/actions/change-requests";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/domain/student-avatar";
import { StudentDetailTabs } from "./detail-tabs.client";

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
  ]);

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
        locationRequests={locationRequests}
        photoRequests={photoRequests}
      />
    </div>
  );
}
