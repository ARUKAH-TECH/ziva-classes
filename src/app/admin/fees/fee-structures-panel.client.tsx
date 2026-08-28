"use client";

import { useState } from "react";
import { Plus, RefreshCw, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createFeeStructure,
  setFeeStructureActive,
  type FeeStructureRow,
} from "@/lib/actions/fee-structures";
import { generateChargesForTerm } from "@/lib/actions/charges";
import type { ClassSubjectTeacherOption } from "@/lib/actions/schedules";
import type { AcademicYear } from "@/lib/actions/academic-years";
import type { Term } from "@/lib/actions/terms";

export function FeeStructuresPanel({
  initialFeeStructures,
  classSubjectOptions,
  years,
  terms,
}: {
  initialFeeStructures: FeeStructureRow[];
  classSubjectOptions: ClassSubjectTeacherOption[];
  years: AcademicYear[];
  terms: Term[];
}) {
  const [structures, setStructures] = useState(initialFeeStructures);
  const [addOpen, setAddOpen] = useState(false);
  const [genTermId, setGenTermId] = useState(terms.find((t) => t.is_current)?.id ?? terms[0]?.id ?? "");
  const [generating, setGenerating] = useState(false);

  // de-dupe class+subject options (schedule options list one row per
  // teacher; fee structures are set per class+subject, not per teacher)
  const uniqueClassSubjects = Array.from(
    new Map(classSubjectOptions.map((o) => [o.class_subject_id, o])).values()
  );

  async function generate() {
    if (!genTermId) return;
    setGenerating(true);
    const result = await generateChargesForTerm(genTermId);
    setGenerating(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    alert(`${result.data.created} student charge(s) created.`);
  }

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-end gap-2">
            <div>
              <Label htmlFor="gen-term">Generate charges for term</Label>
              <Select id="gen-term" value={genTermId} onChange={(e) => setGenTermId(e.target.value)} className="w-48">
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="secondary" size="sm" onClick={generate} disabled={generating || !genTermId}>
              <RefreshCw className="h-4 w-4" /> {generating ? "Generating..." : "Generate"}
            </Button>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)} disabled={uniqueClassSubjects.length === 0}>
            <Plus className="h-4 w-4" /> Add fee structure
          </Button>
        </div>

        {terms.length === 0 && (
          <Alert variant="warning" className="mb-4">
            Set up a term for the current academic year in Settings before generating charges.
          </Alert>
        )}

        {structures.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No fee structures yet"
            description="Set a fee per subject per class — e.g. Mathematics (JHS 2) = GH₵100 for Term 1."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Class</TH>
                <TH>Subject</TH>
                <TH>Year</TH>
                <TH>Term</TH>
                <TH>Amount</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {structures.map((s) => (
                <TR key={s.id}>
                  <TD className="font-medium text-navy-900">{s.class_name}</TD>
                  <TD>{s.subject_name}</TD>
                  <TD>{s.academic_year_name}</TD>
                  <TD>{s.term_name ?? "All terms"}</TD>
                  <TD>GH₵{s.amount}</TD>
                  <TD>
                    <Badge variant={s.active ? "success" : "neutral"}>{s.active ? "Active" : "Inactive"}</Badge>
                  </TD>
                  <TD className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const result = await setFeeStructureActive(s.id, !s.active);
                        if (result.success) {
                          setStructures((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !s.active } : x)));
                        } else {
                          alert(result.error);
                        }
                      }}
                    >
                      {s.active ? "Deactivate" : "Activate"}
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>

      <AddFeeStructureDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        classSubjects={uniqueClassSubjects}
        years={years}
        terms={terms}
      />
    </Card>
  );
}

function AddFeeStructureDialog({
  open,
  onClose,
  classSubjects,
  years,
  terms,
}: {
  open: boolean;
  onClose: () => void;
  classSubjects: ClassSubjectTeacherOption[];
  years: AcademicYear[];
  terms: Term[];
}) {
  const [classSubjectId, setClassSubjectId] = useState(classSubjects[0]?.class_subject_id ?? "");
  const [yearId, setYearId] = useState(years.find((y) => y.is_current)?.id ?? years[0]?.id ?? "");
  const [termId, setTermId] = useState(terms.find((t) => t.is_current)?.id ?? terms[0]?.id ?? "");
  const [amount, setAmount] = useState("100");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await createFeeStructure({
      class_subject_id: classSubjectId,
      academic_year_id: yearId,
      term_id: termId,
      amount: parseFloat(amount),
      description,
    });
    setBusy(false);
    if (result.success) {
      window.location.reload();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add fee structure">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <Label htmlFor="fs-classsubject">Class &amp; subject</Label>
          <Select id="fs-classsubject" value={classSubjectId} onChange={(e) => setClassSubjectId(e.target.value)} required>
            {classSubjects.map((cs) => (
              <option key={cs.class_subject_id} value={cs.class_subject_id}>
                {cs.subject_name} — {cs.class_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="fs-year">Academic year</Label>
            <Select id="fs-year" value={yearId} onChange={(e) => setYearId(e.target.value)} required>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="fs-term">Term</Label>
            <Select id="fs-term" value={termId} onChange={(e) => setTermId(e.target.value)}>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="fs-amount">Amount (GH₵)</Label>
          <Input id="fs-amount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="fs-description">Description (optional)</Label>
          <Input id="fs-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Adding..." : "Add fee structure"}
        </Button>
      </form>
    </Dialog>
  );
}
