"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { createClass, setClassActive, type ClassRow } from "@/lib/actions/classes";
import type { AcademicLevel } from "@/lib/actions/academic-levels";

export function ClassesClient({
  initialClasses,
  levels,
}: {
  initialClasses: ClassRow[];
  levels: AcademicLevel[];
}) {
  const [classes, setClasses] = useState(initialClasses);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={() => setAddOpen(true)} disabled={levels.length === 0}>
            <Plus className="h-4 w-4" /> Add class
          </Button>
        </div>

        {levels.length === 0 && (
          <Alert variant="warning" className="mb-4">
            Add at least one academic level in Settings before creating classes.
          </Alert>
        )}

        {classes.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No classes yet"
            description="Add classes like JHS 2 or Primary 4 under each academic level."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Class</TH>
                <TH>Level</TH>
                <TH>Subjects</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {classes.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium text-navy-900">
                    <Link href={`/admin/classes/${c.id}`} className="hover:text-royal-600 hover:underline">
                      {c.name}
                    </Link>
                  </TD>
                  <TD>{c.academic_level_name}</TD>
                  <TD>{c.subject_count}</TD>
                  <TD>
                    <Badge variant={c.active ? "success" : "neutral"}>
                      {c.active ? "Active" : "Inactive"}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/classes/${c.id}`}>
                        <Button variant="ghost" size="sm">
                          Manage
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const result = await setClassActive(c.id, !c.active);
                          if (result.success) {
                            setClasses((prev) =>
                              prev.map((x) => (x.id === c.id ? { ...x, active: !c.active } : x))
                            );
                          } else {
                            alert(result.error);
                          }
                        }}
                      >
                        {c.active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>

      <AddClassDialog open={addOpen} onClose={() => setAddOpen(false)} levels={levels} />
    </Card>
  );
}

function AddClassDialog({
  open,
  onClose,
  levels,
}: {
  open: boolean;
  onClose: () => void;
  levels: AcademicLevel[];
}) {
  const [name, setName] = useState("");
  const [levelId, setLevelId] = useState(levels[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await createClass({ name, academic_level_id: levelId, description });
    setBusy(false);
    if (result.success) {
      window.location.reload();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add class">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <Label htmlFor="class-name">Name</Label>
          <Input
            id="class-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="JHS 2"
            required
          />
        </div>
        <div>
          <Label htmlFor="class-level">Academic level</Label>
          <Select id="class-level" value={levelId} onChange={(e) => setLevelId(e.target.value)} required>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="class-description">Description (optional)</Label>
          <Textarea
            id="class-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Adding..." : "Add class"}
        </Button>
      </form>
    </Dialog>
  );
}
