"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, X, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { linkParentToStudent, unlinkParentFromStudent, type StudentParentRow } from "@/lib/actions/student-parents";
import type { ParentRow } from "@/lib/actions/parents";

export function ParentsTab({
  studentId,
  studentParents,
  linkableParents,
}: {
  studentId: string;
  studentParents: StudentParentRow[];
  linkableParents: ParentRow[];
}) {
  const [selected, setSelected] = useState(linkableParents[0]?.id ?? "");
  const [relationship, setRelationship] = useState("Parent");
  const [isPrimary, setIsPrimary] = useState(studentParents.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function link() {
    if (!selected) return;
    setBusy(true);
    const result = await linkParentToStudent(studentId, selected, relationship, isPrimary);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    window.location.reload();
  }

  async function unlink(row: StudentParentRow) {
    if (!confirm(`Unlink ${row.first_name} ${row.last_name} from this student?`)) return;
    const result = await unlinkParentFromStudent(row.id, studentId);
    if (!result.success) {
      alert(result.error);
      return;
    }
    window.location.reload();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parents / Guardians</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        {studentParents.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="No parent linked yet"
            description="Link an existing parent account below, or add a new parent account from the Parents page first."
          />
        ) : (
          <ul className="mb-5 divide-y divide-gray-300 rounded border border-gray-300">
            {studentParents.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <span>
                  <span className="font-medium text-navy-900">
                    {p.first_name} {p.last_name}
                  </span>
                  <span className="text-ink-500"> · {p.relationship ?? "Parent"}</span>
                  {p.is_primary && (
                    <Badge variant="royal" className="ml-2">
                      Primary
                    </Badge>
                  )}
                </span>
                <button
                  aria-label="Unlink"
                  onClick={() => unlink(p)}
                  className="rounded p-1 text-ink-500 hover:bg-gray-100 hover:text-error"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {linkableParents.length === 0 ? (
          <p className="text-sm text-ink-500">
            No unlinked parent accounts available.{" "}
            <Link href="/admin/parents" className="text-royal-600 hover:underline">
              Add one on the Parents page
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px]">
              <Label htmlFor="link-parent">Parent</Label>
              <Select id="link-parent" value={selected} onChange={(e) => setSelected(e.target.value)}>
                {linkableParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} {p.email ? `(${p.email})` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-[140px]">
              <Label htmlFor="link-relationship">Relationship</Label>
              <Input id="link-relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-sm">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-royal-600 focus:ring-royal-600"
              />
              Primary guardian
            </label>
            <Button size="sm" onClick={link} disabled={busy}>
              <Plus className="h-4 w-4" /> Link parent
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
