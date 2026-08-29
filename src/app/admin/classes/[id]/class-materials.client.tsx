"use client";

import { useState } from "react";
import { Plus, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { addClassMaterial, removeClassMaterial, type ClassMaterialRow } from "@/lib/actions/class-materials";

export function ClassMaterialsClient({
  classId,
  initialMaterials,
}: {
  classId: string;
  initialMaterials: ClassMaterialRow[];
}) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    setError(null);
    setBusy(true);
    const result = await addClassMaterial(classId, name, description);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setName("");
    setDescription("");
    window.location.reload();
  }

  async function remove(m: ClassMaterialRow) {
    if (!confirm(`Remove ${m.name}?`)) return;
    const result = await removeClassMaterial(m.id, classId);
    if (!result.success) {
      alert(result.error);
      return;
    }
    setMaterials((prev) => prev.filter((x) => x.id !== m.id));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Materials</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-ink-500">
          Required books/items for this class — visible to parents and students. To bill for
          materials, use Fees → Add materials fee instead.
        </p>

        {materials.length === 0 ? (
          <EmptyState icon={Package} title="No materials listed yet" description="Add required books or items below." />
        ) : (
          <ul className="mb-5 divide-y divide-gray-300 rounded border border-gray-300">
            {materials.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <span>
                  <span className="font-medium text-navy-900">{m.name}</span>
                  {m.description && <span className="text-ink-500"> — {m.description}</span>}
                </span>
                <button
                  aria-label={`Remove ${m.name}`}
                  onClick={() => remove(m)}
                  className="rounded p-1 text-ink-500 hover:bg-gray-100 hover:text-error"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="mb-3 text-sm text-error">{error}</p>}

        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="material-name">Name</Label>
            <Input
              id="material-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mathematics textbook"
              className="max-w-xs"
            />
          </div>
          <div>
            <Label htmlFor="material-description">Description (optional)</Label>
            <Input
              id="material-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <Button type="submit" size="sm" disabled={busy || !name}>
            <Plus className="h-4 w-4" /> Add material
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
