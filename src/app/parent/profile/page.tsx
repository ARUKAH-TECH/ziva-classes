import { getMyParentProfile } from "@/lib/actions/parents";
import { MyProfileCard } from "@/components/domain/my-profile-card.client";

export default async function ParentProfilePage() {
  const parent = await getMyParentProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1>Profile</h1>
        <p className="mt-1 text-sm text-ink-500">Your parent/guardian account details.</p>
      </div>

      <MyProfileCard
        firstName={parent?.first_name ?? ""}
        lastName={parent?.last_name ?? ""}
        email={parent?.email ?? null}
        phone={parent?.phone ?? null}
        revalidatePathAfter="/parent/profile"
        fields={[
          ...(parent?.login_id ? [{ label: "Login ID", value: parent.login_id }] : []),
          { label: "Occupation", value: parent?.occupation ?? "—" },
          { label: "Address", value: parent?.address ?? "—" },
        ]}
      />
    </div>
  );
}
