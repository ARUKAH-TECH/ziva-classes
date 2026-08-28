import { getOrganization } from "@/lib/actions/organization";
import { listAcademicYears } from "@/lib/actions/academic-years";
import { listAcademicLevels } from "@/lib/actions/academic-levels";
import { listGradingScales } from "@/lib/actions/grading-scales";
import { SettingsTabs } from "./settings-tabs.client";

export default async function SettingsPage() {
  const [organization, academicYears, academicLevels, gradingScales] = await Promise.all([
    getOrganization(),
    listAcademicYears(),
    listAcademicLevels(),
    listGradingScales(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1>Settings</h1>
        <p className="mt-1 text-sm text-ink-500">
          Organization profile, academic structure, and policy configuration.
        </p>
      </div>

      <SettingsTabs
        organization={organization}
        initialAcademicYears={academicYears}
        initialAcademicLevels={academicLevels}
        initialGradingScales={gradingScales}
      />
    </div>
  );
}
