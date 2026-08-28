"use client";

import { useEffect, useState } from "react";
import { Plus, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createStudentNeed,
  setNeedStatus,
  addIntervention,
  updateInterventionOutcome,
  listStudentsForClassSubject,
  type StudentNeedRow,
  type Priority,
  type NeedStatus,
  type InterventionStatus,
  type RosterOption,
} from "@/lib/actions/student-needs";
import type { MyClassSubjectOption } from "@/lib/actions/assessments";

export function SupportClient({
  initialNeeds,
  classSubjects,
  isAdmin,
}: {
  initialNeeds: StudentNeedRow[];
  classSubjects: MyClassSubjectOption[];
  isAdmin: boolean;
}) {
  const [needs, setNeeds] = useState(initialNeeds);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Card>
      <CardContent>
        {!isAdmin && (
          <div className="mb-4 flex justify-end">
            <Button size="sm" onClick={() => setAddOpen(true)} disabled={classSubjects.length === 0}>
              <Plus className="h-4 w-4" /> Flag a need
            </Button>
          </div>
        )}

        {needs.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="No needs recorded"
            description={isAdmin ? "Needs identified by teachers will appear here." : "Flag a learning or support need for one of your students."}
          />
        ) : (
          <ul className="space-y-3">
            {needs.map((n) => (
              <NeedCard key={n.id} need={n} onChange={(updated) => setNeeds((prev) => prev.map((x) => (x.id === n.id ? updated : x)))} />
            ))}
          </ul>
        )}
      </CardContent>

      {addOpen && <AddNeedDialog classSubjects={classSubjects} onClose={() => setAddOpen(false)} />}
    </Card>
  );
}

function NeedCard({ need, onChange }: { need: StudentNeedRow; onChange: (n: StudentNeedRow) => void }) {
  const [interventionOpen, setInterventionOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function changeStatus(status: NeedStatus) {
    setBusy(true);
    const result = await setNeedStatus(need.id, status);
    setBusy(false);
    if (result.success) onChange({ ...need, status });
    else alert(result.error);
  }

  return (
    <li className="rounded border border-gray-300 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-navy-900">{need.student_name}</span>
          {need.subject_name && <Badge variant="neutral">{need.subject_name}</Badge>}
          <Badge variant={need.priority === "HIGH" ? "error" : need.priority === "MEDIUM" ? "warning" : "neutral"}>
            {need.priority}
          </Badge>
          {!need.visible_to_parent && <Badge variant="neutral">Internal only</Badge>}
        </div>
        <Select
          value={need.status}
          onChange={(e) => changeStatus(e.target.value as NeedStatus)}
          disabled={busy}
          className="w-36"
        >
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
        </Select>
      </div>
      <p className="mt-2 text-sm text-navy-900">{need.need_description}</p>
      {need.recommended_support && <p className="mt-1 text-xs text-ink-500">Recommended: {need.recommended_support}</p>}
      <p className="mt-1 text-xs text-ink-500">
        Identified by {need.identified_by_name ?? "—"} · {new Date(need.created_at).toLocaleDateString()}
      </p>

      {need.interventions.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-gray-300 pt-3">
          {need.interventions.map((iv) => (
            <InterventionRow key={iv.id} intervention={iv} />
          ))}
        </ul>
      )}

      <Button variant="ghost" size="sm" className="mt-2" onClick={() => setInterventionOpen(true)}>
        <Plus className="h-4 w-4" /> Add intervention
      </Button>

      {interventionOpen && <AddInterventionDialog needId={need.id} onClose={() => setInterventionOpen(false)} />}
    </li>
  );
}

function InterventionRow({ intervention }: { intervention: StudentNeedRow["interventions"][number] }) {
  const [editing, setEditing] = useState(false);
  const [outcome, setOutcome] = useState(intervention.outcome ?? "");
  const [status, setStatus] = useState<InterventionStatus>(intervention.status);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const result = await updateInterventionOutcome(intervention.id, { outcome, status });
    setBusy(false);
    if (result.success) setEditing(false);
    else alert(result.error);
  }

  return (
    <li className="text-sm">
      <div className="flex items-center justify-between">
        <span className="text-navy-900">{intervention.intervention}</span>
        <Badge variant={status === "COMPLETED" ? "success" : status === "DISCONTINUED" ? "neutral" : "royal"}>
          {status}
        </Badge>
      </div>
      <p className="text-xs text-ink-500">
        {intervention.assigned_teacher_name ?? "—"}
        {intervention.review_date && ` · Review by ${intervention.review_date}`}
      </p>
      {editing ? (
        <div className="mt-1 space-y-2">
          <Textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={2} placeholder="Outcome" />
          <Select value={status} onChange={(e) => setStatus(e.target.value as InterventionStatus)} className="w-40">
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="DISCONTINUED">Discontinued</option>
          </Select>
          <Button size="sm" onClick={save} disabled={busy}>
            Save
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {intervention.outcome && <p className="text-xs text-ink-500">Outcome: {intervention.outcome}</p>}
          <button onClick={() => setEditing(true)} className="text-xs text-royal-600 hover:underline">
            Update
          </button>
        </div>
      )}
    </li>
  );
}

function AddNeedDialog({ classSubjects, onClose }: { classSubjects: MyClassSubjectOption[]; onClose: () => void }) {
  const [classSubjectId, setClassSubjectId] = useState(classSubjects[0]?.class_subject_id ?? "");
  const [students, setStudents] = useState<RosterOption[]>([]);
  const [studentId, setStudentId] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [support, setSupport] = useState("");
  const [visibleToParent, setVisibleToParent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!classSubjectId) return;
    let cancelled = false;
    listStudentsForClassSubject(classSubjectId).then((result) => {
      if (!cancelled) {
        setStudents(result);
        setStudentId("");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [classSubjectId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const cs = classSubjects.find((c) => c.class_subject_id === classSubjectId);
    const result = await createStudentNeed({
      student_id: studentId,
      subject_id: cs ? classSubjectId : "",
      need_description: description,
      priority,
      recommended_support: support,
      visible_to_parent: visibleToParent,
    });
    setBusy(false);
    if (result.success) window.location.reload();
    else setError(result.error);
  }

  return (
    <Dialog open onClose={onClose} title="Flag a learning need">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <Label htmlFor="need-cs">Class &amp; subject</Label>
          <Select
            id="need-cs"
            value={classSubjectId}
            onChange={(e) => setClassSubjectId(e.target.value)}
          >
            {classSubjects.map((cs) => (
              <option key={cs.class_subject_id} value={cs.class_subject_id}>
                {cs.subject_name} — {cs.class_name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="need-student">Student</Label>
          <Select id="need-student" value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
            <option value="">Select a student</option>
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="need-description">Need description</Label>
          <Textarea id="need-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} required />
        </div>
        <div>
          <Label htmlFor="need-priority">Priority</Label>
          <Select id="need-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="need-support">Recommended support (optional)</Label>
          <Textarea id="need-support" value={support} onChange={(e) => setSupport(e.target.value)} rows={2} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={visibleToParent}
            onChange={(e) => setVisibleToParent(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-royal-600 focus:ring-royal-600"
          />
          Visible to parent (uncheck for internal-only notes)
        </label>
        <Button type="submit" disabled={busy || !studentId} className="w-full">
          {busy ? "Saving..." : "Flag need"}
        </Button>
      </form>
    </Dialog>
  );
}

function AddInterventionDialog({ needId, onClose }: { needId: string; onClose: () => void }) {
  const [intervention, setIntervention] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await addIntervention({ student_need_id: needId, intervention, review_date: reviewDate });
    setBusy(false);
    if (result.success) window.location.reload();
    else setError(result.error);
  }

  return (
    <Dialog open onClose={onClose} title="Add intervention">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <Label htmlFor="iv-text">Intervention</Label>
          <Textarea id="iv-text" value={intervention} onChange={(e) => setIntervention(e.target.value)} rows={2} required />
        </div>
        <div>
          <Label htmlFor="iv-date">Review date (optional)</Label>
          <Input id="iv-date" type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Saving..." : "Add intervention"}
        </Button>
      </form>
    </Dialog>
  );
}
