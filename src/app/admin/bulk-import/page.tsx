import { ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { EmptyState } from "@/components/ui/empty-state";
import { BulkImportClient } from "./bulk-import.client";

export default async function BulkImportPage() {
  const user = await getCurrentUser();

  if (user.role !== "SUPER_ADMIN") {
    return (
      <div className="space-y-6">
        <div>
          <h1>Bulk Import</h1>
        </div>
        <EmptyState
          icon={ShieldAlert}
          title="Restricted to the Super Admin"
          description="Bulk import can create logins and financial records in one pass, so it's limited to the Super Admin account. Use the regular Students, Parents, Teachers, and Fees pages to add records one at a time."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>Bulk Import</h1>
        <p className="mt-1 text-sm text-ink-500">
          Paste rows copied from a spreadsheet to register many teachers, parents, students, classes, fees, timetable
          slots, or payments at once — instead of the one-at-a-time forms.
        </p>
      </div>
      <BulkImportClient />
    </div>
  );
}
