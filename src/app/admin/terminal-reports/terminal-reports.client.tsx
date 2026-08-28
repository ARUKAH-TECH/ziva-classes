"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  listReportsForClass,
  generateReportsForClass,
  generateReport,
  type TerminalReportSummary,
} from "@/lib/actions/terminal-reports";
import type { ClassRow } from "@/lib/actions/classes";
import type { Term } from "@/lib/actions/terms";

export function TerminalReportsClient({ classes, terms }: { classes: ClassRow[]; terms: Term[] }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [termId, setTermId] = useState(terms.find((t) => t.is_current)?.id ?? terms[0]?.id ?? "");
  const [ranking, setRanking] = useState(false);
  const [rows, setRows] = useState<TerminalReportSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function load() {
    if (!classId || !termId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setRows(await listReportsForClass(classId, termId));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, termId]);

  async function generateAll() {
    if (!classId || !termId) return;
    setGenerating(true);
    const result = await generateReportsForClass(classId, termId, ranking);
    setGenerating(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    await load();
  }

  async function generateOne(studentId: string) {
    setGenerating(true);
    const result = await generateReport(studentId, termId, ranking);
    setGenerating(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    await load();
  }

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="tr-class">Class</Label>
              <Select id="tr-class" value={classId} onChange={(e) => setClassId(e.target.value)} className="w-56">
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.academic_level_name})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="tr-term">Term</Label>
              <Select id="tr-term" value={termId} onChange={(e) => setTermId(e.target.value)} className="w-44">
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-sm">
              <input
                type="checkbox"
                checked={ranking}
                onChange={(e) => setRanking(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-royal-600 focus:ring-royal-600"
              />
              Enable ranking for this batch
            </label>
          </div>
          <Button size="sm" onClick={generateAll} disabled={generating || !classId || !termId}>
            <RefreshCw className="h-4 w-4" /> {generating ? "Generating..." : "Generate all reports for class"}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-ink-500">Loading...</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No students found"
            description="Choose a class and term with active enrollments, or add students to this class first."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Student</TH>
                <TH>Status</TH>
                <TH>Version</TH>
                <TH>Overall Average</TH>
                <TH>Overall Grade</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.student_id}>
                  <TD className="font-medium text-navy-900">{r.student_name}</TD>
                  <TD>
                    <Badge
                      variant={r.status === "PUBLISHED" ? "success" : r.version > 0 ? "warning" : "neutral"}
                    >
                      {r.version > 0 ? r.status : "No report"}
                    </Badge>
                  </TD>
                  <TD>{r.version > 0 ? `v${r.version}` : "—"}</TD>
                  <TD>{r.overall_average !== null ? `${r.overall_average}%` : "—"}</TD>
                  <TD>{r.overall_grade ?? "—"}</TD>
                  <TD className="text-right">
                    {r.version > 0 ? (
                      <Link href={`/admin/terminal-reports/${r.id}`}>
                        <Button variant="ghost" size="sm">
                          Open
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => generateOne(r.student_id)} disabled={generating}>
                        Generate
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
