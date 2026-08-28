import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getMyChild } from "@/lib/actions/parent-children";
import { getStudentCurrentEnrollment } from "@/lib/actions/students";
import { getStudentPhotoUrl } from "@/lib/actions/student-photo";
import { listStudentLocations } from "@/lib/actions/student-location";
import { listStudentSubjects } from "@/lib/actions/student-subjects";
import { getStudentAttendanceSummary } from "@/lib/actions/attendance";
import { getStudentPerformanceSummary } from "@/lib/actions/scores";
import { listStudentCharges } from "@/lib/actions/charges";
import { listVisibleNeedsForChild } from "@/lib/actions/student-needs";
import { getMyOrgSettings } from "@/lib/actions/organization";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/domain/student-avatar";
import { ChildDetailTabs } from "./child-detail-tabs.client";

export default async function ChildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const child = await getMyChild(id);
  if (!child) notFound();

  const enrollment = await getStudentCurrentEnrollment(id);

  const [photoUrl, locations, subjects, attendance, performance, charges, needs, orgSettings] = await Promise.all([
    getStudentPhotoUrl(child.passport_photo_path),
    listStudentLocations(id),
    enrollment ? listStudentSubjects(id, enrollment.academic_year_id) : Promise.resolve([]),
    getStudentAttendanceSummary(id),
    getStudentPerformanceSummary(id),
    listStudentCharges(id),
    listVisibleNeedsForChild(id),
    getMyOrgSettings(),
  ]);

  const balance = Math.round(charges.reduce((s, c) => s + c.balance, 0) * 100) / 100;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/parent/children" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to my children
        </Link>
        <div className="flex items-center gap-4">
          <StudentAvatar url={photoUrl} name={`${child.first_name} ${child.last_name}`} size={56} />
          <div>
            <div className="flex items-center gap-3">
              <h1>
                {child.first_name} {child.last_name}
              </h1>
              <Badge variant={child.status === "ACTIVE" ? "success" : "neutral"}>{child.status}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-ink-500">
              {child.student_number} {enrollment && `· ${enrollment.class_name}`}
            </p>
          </div>
        </div>
      </div>

      <ChildDetailTabs
        studentId={id}
        photoUrl={photoUrl}
        enrollment={enrollment}
        subjects={subjects}
        attendance={attendance}
        performance={performance}
        balance={balance}
        locations={locations}
        needs={needs}
        canEditLocation={orgSettings.parent_can_edit_location}
        canEditPhoto={orgSettings.parent_can_edit_photo}
      />
    </div>
  );
}
