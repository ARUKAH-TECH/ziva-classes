"use client";

import { useState } from "react";
import { Plus, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { addClassSubject, removeClassSubject, type ClassSubjectRow } from "@/lib/actions/classes";
import type { Subject } from "@/lib/actions/subjects";

export function ClassSubjectsClient({
  classId,
  initialClassSubjects,
  availableSubjects,
}: {
  classId: string;
  initialClassSubjects: ClassSubjectRow[];
  availableSubjects: Subject[];
}) {
  const [classSubjects] = useState(initialClassSubjects);
  const [remaining] = useState(availableSubjects);
  const [selected, setSelected] = useState(availableSubjects[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  // Reload after every mutation rather than optimistic local state — the
  // real class_subjects.id is server-generated and other panels on this
  // page (teacher assignment pickers elsewhere) depend on it being correct,
  // so a stale client-side id is worse than a full refresh here.
  async function assign() {
    if (!selected) return;
    setBusy(true);
    const result = await addClassSubject(classId, selected);
    setBusy(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    window.location.reload();
  }

  async function unassign(row: ClassSubjectRow) {
    if (!confirm(`Remove ${row.subject_name} from this class?`)) return;
    setBusy(true);
    const result = await removeClassSubject(row.id);
    setBusy(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    window.location.reload();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subjects taught in this class</CardTitle>
      </CardHeader>
      <CardContent>
        {classSubjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No subjects assigned yet"
            description="Assign the subjects taught in this class below — you'll then be able to assign teachers to each one."
          />
        ) : (
          <ul className="mb-5 flex flex-wrap gap-2">
            {classSubjects.map((cs) => (
              <li
                key={cs.id}
                className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-surface py-1 pl-3 pr-1.5 text-sm"
              >
                {cs.subject_name}
                <button
                  aria-label={`Remove ${cs.subject_name}`}
                  onClick={() => unassign(cs)}
                  className="rounded-full p-0.5 text-ink-500 hover:bg-gray-100 hover:text-error"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {remaining.length > 0 ? (
          <div className="flex items-end gap-2">
            <div className="max-w-xs flex-1">
              <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
                {remaining.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button size="sm" onClick={assign} disabled={busy || !selected}>
              <Plus className="h-4 w-4" /> Assign subject
            </Button>
          </div>
        ) : (
          <p className="text-sm text-ink-500">All active subjects are already assigned to this class.</p>
        )}
      </CardContent>
    </Card>
  );
}
