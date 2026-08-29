"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OverviewPanel } from "./overview-panel.client";
import { FeeStructuresPanel } from "./fee-structures-panel.client";
import { OutstandingPanel } from "./outstanding-panel.client";
import type { FinancialDashboardStats, RecentPaymentRow } from "@/lib/actions/payments";
import type { FeeStructureRow } from "@/lib/actions/fee-structures";
import type { OutstandingRow } from "@/lib/actions/charges";
import type { ClassSubjectTeacherOption } from "@/lib/actions/schedules";
import type { AcademicYear } from "@/lib/actions/academic-years";
import type { Term } from "@/lib/actions/terms";
import type { ClassRow } from "@/lib/actions/classes";

export function FeesTabs({
  stats,
  recentPayments,
  initialFeeStructures,
  outstanding,
  classSubjectOptions,
  years,
  terms,
  classes,
}: {
  stats: FinancialDashboardStats;
  recentPayments: RecentPaymentRow[];
  initialFeeStructures: FeeStructureRow[];
  outstanding: OutstandingRow[];
  classSubjectOptions: ClassSubjectTeacherOption[];
  years: AcademicYear[];
  terms: Term[];
  classes: ClassRow[];
}) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="structures">Fee Structures</TabsTrigger>
        <TabsTrigger value="outstanding">Outstanding Balances</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewPanel stats={stats} recentPayments={recentPayments} />
      </TabsContent>

      <TabsContent value="structures">
        <FeeStructuresPanel
          initialFeeStructures={initialFeeStructures}
          classSubjectOptions={classSubjectOptions}
          years={years}
          terms={terms}
          classes={classes}
        />
      </TabsContent>

      <TabsContent value="outstanding">
        <OutstandingPanel rows={outstanding} />
      </TabsContent>
    </Tabs>
  );
}
