"use client";

import { useState } from "react";
import { Plus, Pencil, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { createSubject, updateSubject, setSubjectActive, type Subject } from "@/lib/actions/subjects";

export function SubjectsClient({ initialSubjects }: { initialSubjects: Subject[] }) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [dialogSubject, setDialogSubject] = useState<Subject | "new" | null>(null);

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={() => setDialogSubject("new")}>
            <Plus className="h-4 w-4" /> Add subject
          </Button>
        </div>

        {subjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No subjects yet"
            description="Add subjects like Mathematics, English, and Science — you'll assign them to classes next."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Code</TH>
                <TH>Description</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {subjects.map((s) => (
                <TR key={s.id}>
                  <TD className="font-medium text-navy-900">{s.name}</TD>
                  <TD>{s.code ?? "—"}</TD>
                  <TD className="max-w-xs truncate">{s.description ?? "—"}</TD>
                  <TD>
                    <Badge variant={s.active ? "success" : "neutral"}>
                      {s.active ? "Active" : "Inactive"}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setDialogSubject(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const result = await setSubjectActive(s.id, !s.active);
                          if (result.success) {
                            setSubjects((prev) =>
                              prev.map((x) => (x.id === s.id ? { ...x, active: !s.active } : x))
                            );
                          } else {
                            alert(result.error);
                          }
                        }}
                      >
                        {s.active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>

      {dialogSubject && (
        <SubjectDialog
          subject={dialogSubject === "new" ? null : dialogSubject}
          onClose={() => setDialogSubject(null)}
        />
      )}
    </Card>
  );
}

function SubjectDialog({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const [name, setName] = useState(subject?.name ?? "");
  const [code, setCode] = useState(subject?.code ?? "");
  const [description, setDescription] = useState(subject?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = subject
      ? await updateSubject(subject.id, { name, code, description })
      : await createSubject({ name, code, description });
    setBusy(false);
    if (result.success) {
      window.location.reload();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open onClose={onClose} title={subject ? "Edit subject" : "Add subject"}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <Label htmlFor="subject-name">Name</Label>
          <Input id="subject-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="subject-code">Code (optional)</Label>
          <Input id="subject-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="MATH" />
        </div>
        <div>
          <Label htmlFor="subject-description">Description (optional)</Label>
          <Textarea
            id="subject-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Saving..." : subject ? "Save changes" : "Add subject"}
        </Button>
      </form>
    </Dialog>
  );
}
