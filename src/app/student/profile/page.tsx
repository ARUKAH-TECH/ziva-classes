import { getMyStudentProfile } from "@/lib/actions/students";
import { MyProfileCard } from "@/components/domain/my-profile-card.client";

export default async function StudentProfilePage() {
  const student = await getMyStudentProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1>Profile</h1>
        <p className="mt-1 text-sm text-ink-500">Your student account details.</p>
      </div>

      <MyProfileCard
        firstName={student?.first_name ?? ""}
        lastName={student?.last_name ?? ""}
        email={student?.account_email ?? null}
        phone={student?.account_phone ?? null}
        revalidatePathAfter="/student/profile"
        fields={[
          { label: "Student number", value: student?.student_number ?? "—" },
          { label: "Status", value: student?.status ?? "—" },
        ]}
      />
    </div>
  );
}
