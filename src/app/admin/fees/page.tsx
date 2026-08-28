import { getFinancialDashboardStats, listRecentPayments } from "@/lib/actions/payments";
import { listFeeStructures } from "@/lib/actions/fee-structures";
import { listOutstandingBalances } from "@/lib/actions/charges";
import { listScheduleOptions } from "@/lib/actions/schedules";
import { listAcademicYears } from "@/lib/actions/academic-years";
import { listTerms } from "@/lib/actions/terms";
import { FeesTabs } from "./fees-tabs.client";

export default async function AdminFeesPage() {
  const [stats, feeStructures, outstanding, options, years] = await Promise.all([
    getFinancialDashboardStats(),
    listFeeStructures(),
    listOutstandingBalances(),
    listScheduleOptions(),
    listAcademicYears(),
  ]);
  const recentPayments = await listRecentPayments(10);

  const currentYear = years.find((y) => y.is_current) ?? years[0] ?? null;
  const terms = currentYear ? await listTerms(currentYear.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1>Fees &amp; Payments</h1>
        <p className="mt-1 text-sm text-ink-500">
          Per-subject fee structures, student charges, and payments — MTN Mobile Money and Cash only.
        </p>
      </div>
      <FeesTabs
        stats={stats}
        recentPayments={recentPayments}
        initialFeeStructures={feeStructures}
        outstanding={outstanding}
        classSubjectOptions={options}
        years={years}
        terms={terms}
      />
    </div>
  );
}
