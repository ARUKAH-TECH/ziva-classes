import { getMyTeacherProfile } from "@/lib/actions/teachers";
import { MyProfileCard } from "@/components/domain/my-profile-card.client";

export default async function TeacherProfilePage() {
  const teacher = await getMyTeacherProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1>Profile</h1>
        <p className="mt-1 text-sm text-ink-500">Your teacher account details.</p>
      </div>

      <MyProfileCard
        firstName={teacher?.first_name ?? ""}
        lastName={teacher?.last_name ?? ""}
        email={teacher?.email ?? null}
        phone={teacher?.phone ?? null}
        revalidatePathAfter="/teacher/profile"
        fields={[
          { label: "Employee number", value: teacher?.employee_number ?? "—" },
          { label: "Qualification", value: teacher?.qualification ?? "—" },
          { label: "Specialization", value: teacher?.specialization ?? "—" },
        ]}
      />
    </div>
  );
}
