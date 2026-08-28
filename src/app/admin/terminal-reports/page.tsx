import { listClasses } from "@/lib/actions/classes";
import { listAcademicYears } from "@/lib/actions/academic-years";
import { listTerms } from "@/lib/actions/terms";
import { TerminalReportsClient } from "./terminal-reports.client";

export default async function AdminTerminalReportsPage() {
  const [classes, years] = await Promise.all([listClasses(), listAcademicYears()]);
  const currentYear = years.find((y) => y.is_current) ?? years[0] ?? null;
  const terms = currentYear ? await listTerms(currentYear.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1>Terminal Reports</h1>
        <p className="mt-1 text-sm text-ink-500">
          Generated from real academic, attendance, and fee records — never manually calculated.
        </p>
      </div>
      <TerminalReportsClient classes={classes.filter((c) => c.active)} terms={terms} />
    </div>
  );
}
