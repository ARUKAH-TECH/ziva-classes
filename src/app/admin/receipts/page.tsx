import { listAllPayments } from "@/lib/actions/payments";
import { ReceiptsClient } from "./receipts.client";

export default async function AdminReceiptsPage() {
  const payments = await listAllPayments();

  return (
    <div className="space-y-6">
      <div>
        <h1>Receipts</h1>
        <p className="mt-1 text-sm text-ink-500">
          Every payment receipt in one place — find any student&apos;s receipt and print it directly.
        </p>
      </div>
      <ReceiptsClient payments={payments} />
    </div>
  );
}
