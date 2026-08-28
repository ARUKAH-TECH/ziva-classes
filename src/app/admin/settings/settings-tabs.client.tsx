"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OrganizationPanel } from "./organization-panel.client";
import { AcademicStructurePanel } from "./academic-structure-panel.client";
import { PoliciesPanel } from "./policies-panel.client";
import { GradingPanel } from "./grading-panel.client";
import type { Organization } from "@/lib/actions/organization";
import type { AcademicYear } from "@/lib/actions/academic-years";
import type { AcademicLevel } from "@/lib/actions/academic-levels";
import type { GradingScale } from "@/lib/actions/grading-scales";

export function SettingsTabs({
  organization,
  initialAcademicYears,
  initialAcademicLevels,
  initialGradingScales,
}: {
  organization: Organization | null;
  initialAcademicYears: AcademicYear[];
  initialAcademicLevels: AcademicLevel[];
  initialGradingScales: GradingScale[];
}) {
  return (
    <Tabs defaultValue="organization">
      <TabsList>
        <TabsTrigger value="organization">Organization</TabsTrigger>
        <TabsTrigger value="academic">Academic Structure</TabsTrigger>
        <TabsTrigger value="grading">Grading</TabsTrigger>
        <TabsTrigger value="policies">Policies</TabsTrigger>
      </TabsList>

      <TabsContent value="organization">
        <OrganizationPanel organization={organization} />
      </TabsContent>

      <TabsContent value="academic">
        <AcademicStructurePanel
          initialAcademicYears={initialAcademicYears}
          initialAcademicLevels={initialAcademicLevels}
        />
      </TabsContent>

      <TabsContent value="grading">
        <GradingPanel initialScales={initialGradingScales} levels={initialAcademicLevels} />
      </TabsContent>

      <TabsContent value="policies">
        <PoliciesPanel organization={organization} />
      </TabsContent>
    </Tabs>
  );
}
