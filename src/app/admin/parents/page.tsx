import { listParents } from "@/lib/actions/parents";
import { ParentsClient } from "./parents.client";

export default async function ParentsPage() {
  const parents = await listParents();

  return (
    <div className="space-y-6">
      <div>
        <h1>Parents</h1>
        <p className="mt-1 text-sm text-ink-500">
          Manage parent/guardian accounts. Link them to children from a student&apos;s profile.
        </p>
      </div>
      <ParentsClient initialParents={parents} />
    </div>
  );
}
