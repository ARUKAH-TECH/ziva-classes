"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
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
  createAssessmentAsTeacher,
  deleteAssessment,
  type AssessmentRow,
  type AssessmentType,
  type MyClassSubjectOption,
} from "@/lib/actions/assessments";
import type { Term } from "@/lib/actions/terms";

const TYPES: AssessmentType[] = ["ASSIGNMENT", "QUIZ", "TEST", "EXAMINATION", "PROJECT"];

export function TeacherAssessmentsClient({
  initialAssessments,
  classSubjects,
  terms,
}: {
  initialAssessments: AssessmentRow[];
  classSubjects: MyClassSubjectOption[];
  terms: Term[];
}) {
  const [assessments, setAssessments] = useState(initialAssessments);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={() => setAddOpen(true)} disabled={classSubjects.length === 0 || terms.length === 0}>
            <Plus className="h-4 w-4" /> New assessment
          </Button>
        </div>

        {(classSubjects.length === 0 || terms.length === 0) && (
          <Alert variant="warning" className="mb-4">
            {classSubjects.length === 0
              ? "You have no class/subject assignments yet — contact your admin."
              : "No term has been set up for the current academic year yet."}
          </Alert>
        )}

        {assessments.length === 0 ? (
          <EmptyState icon={FileText} title="No assessments yet" description="Create your first assessment above." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Class</TH>
                <TH>Subject</TH>
                <TH>Type</TH>
                <TH>Date</TH>
                <TH>Scores</TH>
                <TH>Average</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {assessments.map((a) => (
                <TR key={a.id}>
                  <TD className="font-medium text-navy-900">{a.name}</TD>
                  <TD>{a.class_name}</TD>
                  <TD>{a.subject_name}</TD>
                  <TD>
                    <Badge variant="neutral">{a.assessment_type}</Badge>
                  </TD>
                  <TD>{a.assessment_date ?? "—"}</TD>
                  <TD>{a.score_count}</TD>
                  <TD>{a.average_percentage !== null ? `${a.average_percentage}%` : "—"}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/teacher/assessments/${a.id}/scores`}>
                        <Button variant="ghost" size="sm">
                          Enter scores
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!confirm(`Delete "${a.name}"?`)) return;
                          const result = await deleteAssessment(a.id);
                          if (result.success) {
                            setAssessments((prev) => prev.filter((x) => x.id !== a.id));
                          } else {
                            alert(result.error);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>

      <AddAssessmentDialog open={addOpen} onClose={() => setAddOpen(false)} classSubjects={classSubjects} terms={terms} />
    </Card>
  );
}

function AddAssessmentDialog({
  open,
  onClose,
  classSubjects,
  terms,
}: {
  open: boolean;
  onClose: () => void;
  classSubjects: MyClassSubjectOption[];
  terms: Term[];
}) {
  const [classSubjectId, setClassSubjectId] = useState(classSubjects[0]?.class_subject_id ?? "");
  const [termId, setTermId] = useState(terms.find((t) => t.is_current)?.id ?? terms[0]?.id ?? "");
  const [name, setName] = useState("");
  const [type, setType] = useState<AssessmentType>("TEST");
  const [date, setDate] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await createAssessmentAsTeacher({
      class_subject_id: classSubjectId,
      term_id: termId,
      name,
      assessment_type: type,
      assessment_date: date,
      maximum_score: parseFloat(maxScore),
    });
    setBusy(false);
    if (result.success) {
      window.location.reload();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="New assessment">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <Label htmlFor="a-classsubject">Class &amp; subject</Label>
          <Select id="a-classsubject" value={classSubjectId} onChange={(e) => setClassSubjectId(e.target.value)} required>
            {classSubjects.map((cs) => (
              <option key={cs.class_subject_id} value={cs.class_subject_id}>
                {cs.subject_name} — {cs.class_name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="a-term">Term</Label>
          <Select id="a-term" value={termId} onChange={(e) => setTermId(e.target.value)} required>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="a-name">Assessment name</Label>
          <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mid-term Test" required />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="a-type">Type</Label>
            <Select id="a-type" value={type} onChange={(e) => setType(e.target.value as AssessmentType)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="a-date">Date</Label>
            <Input id="a-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="a-max">Maximum score</Label>
          <Input id="a-max" type="number" min={1} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} required />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Creating..." : "Create assessment"}
        </Button>
      </form>
    </Dialog>
  );
}
