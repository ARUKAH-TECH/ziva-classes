"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OverviewTab } from "./overview-tab.client";
import { PhotoTab } from "./photo-tab.client";
import { LocationTab } from "./location-tab.client";
import { SubjectsTab } from "./subjects-tab.client";
import { ParentsTab } from "./parents-tab.client";
import { FeesTab } from "./fees-tab.client";
import { AccountTab } from "./account-tab.client";
import type { StudentDetail, CurrentEnrollment } from "@/lib/actions/students";
import type { StudentLocation } from "@/lib/actions/student-location";
import type { StudentSubjectRow } from "@/lib/actions/student-subjects";
import type { StudentParentRow } from "@/lib/actions/student-parents";
import type { ParentRow } from "@/lib/actions/parents";
import type { AttendanceSummary } from "@/lib/actions/attendance";
import type { StudentPerformanceSummary } from "@/lib/actions/scores";
import type { StudentChargeRow } from "@/lib/actions/charges";
import type { PaymentRow } from "@/lib/actions/payments";
import type { ChangeRequestRow } from "@/lib/actions/change-requests";

export function StudentDetailTabs({
  student,
  photoUrl,
  enrollment,
  attendance,
  performance,
  locations,
  studentSubjects,
  availableClassSubjects,
  studentParents,
  linkableParents,
  charges,
  payments,
  locationRequests,
  photoRequests,
}: {
  student: StudentDetail;
  photoUrl: string | null;
  enrollment: CurrentEnrollment | null;
  attendance: AttendanceSummary;
  performance: StudentPerformanceSummary;
  locations: StudentLocation[];
  studentSubjects: StudentSubjectRow[];
  availableClassSubjects: { class_subject_id: string; subject_name: string }[];
  studentParents: StudentParentRow[];
  linkableParents: ParentRow[];
  charges: StudentChargeRow[];
  payments: PaymentRow[];
  locationRequests: ChangeRequestRow[];
  photoRequests: (ChangeRequestRow & { preview_url?: string | null })[];
}) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="photo">Photo</TabsTrigger>
        <TabsTrigger value="location">Location</TabsTrigger>
        <TabsTrigger value="subjects">Subjects</TabsTrigger>
        <TabsTrigger value="fees">Fees</TabsTrigger>
        <TabsTrigger value="parents">Parents/Guardians</TabsTrigger>
        <TabsTrigger value="account">Account</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab student={student} enrollment={enrollment} attendance={attendance} performance={performance} />
      </TabsContent>

      <TabsContent value="photo">
        <PhotoTab
          studentId={student.id}
          photoUrl={photoUrl}
          hasPhoto={!!student.passport_photo_path}
          pendingRequests={photoRequests}
        />
      </TabsContent>

      <TabsContent value="location">
        <LocationTab studentId={student.id} locations={locations} pendingRequests={locationRequests} />
      </TabsContent>

      <TabsContent value="subjects">
        <SubjectsTab
          studentId={student.id}
          enrollment={enrollment}
          studentSubjects={studentSubjects}
          availableClassSubjects={availableClassSubjects}
        />
      </TabsContent>

      <TabsContent value="fees">
        <FeesTab studentId={student.id} charges={charges} payments={payments} />
      </TabsContent>

      <TabsContent value="parents">
        <ParentsTab studentId={student.id} studentParents={studentParents} linkableParents={linkableParents} />
      </TabsContent>

      <TabsContent value="account">
        <AccountTab
          studentId={student.id}
          hasAccount={!!student.optional_user_id}
          accountEmail={student.account_email}
          suggestedEmail={student.email}
        />
      </TabsContent>
    </Tabs>
  );
}
