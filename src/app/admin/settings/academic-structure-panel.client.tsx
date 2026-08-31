"use client";

import { useEffect, useState } from "react";
import { Plus, Star, Trash2, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createAcademicYear,
  deleteAcademicYear,
  setCurrentAcademicYear,
  type AcademicYear,
} from "@/lib/actions/academic-years";
import { listTerms, createTerm, setCurrentTerm, deleteTerm, type Term } from "@/lib/actions/terms";
import {
  createAcademicLevel,
  deleteAcademicLevel,
  seedStandardLevels,
  updateAcademicLevel,
  type AcademicLevel,
} from "@/lib/actions/academic-levels";

export function AcademicStructurePanel({
  initialAcademicYears,
  initialAcademicLevels,
}: {
  initialAcademicYears: AcademicYear[];
  initialAcademicLevels: AcademicLevel[];
}) {
  const [years, setYears] = useState(initialAcademicYears);
  const [levels, setLevels] = useState(initialAcademicLevels);

  return (
    <div className="space-y-6">
      <LevelsCard levels={levels} setLevels={setLevels} />
      <YearsCard years={years} setYears={setYears} />
    </div>
  );
}

// ---------------- Academic Levels ----------------

function LevelsCard({
  levels,
  setLevels,
}: {
  levels: AcademicLevel[];
  setLevels: React.Dispatch<React.SetStateAction<AcademicLevel[]>>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [order, setOrder] = useState((levels.length + 1).toString());
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AcademicLevel | null>(null);

  async function seed() {
    setBusy(true);
    const result = await seedStandardLevels();
    setBusy(false);
    if (result.success) window.location.reload();
    else setError(result.error);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await createAcademicLevel({ name, level_order: parseInt(order, 10) || 0, code });
    setBusy(false);
    if (result.success) {
      window.location.reload();
    } else {
      setError(result.error);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Academic Levels</CardTitle>
        <div className="flex gap-2">
          {levels.length === 0 && (
            <Button variant="secondary" size="sm" onClick={seed} disabled={busy}>
              Seed Primary/JHS/SHS
            </Button>
          )}
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add level
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {levels.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="No academic levels yet"
            description="Add Primary, JHS, and SHS levels — or use the seed button to add the standard 12 levels at once."
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-ink-500">
              Click a level to set its Code — used to build each student&apos;s ID (e.g. Primary → PRI gives
              ZIVA/PRI/26/0001). Levels without a code shown in gray still work, just fall back to a longer code
              until you set one.
            </p>
            <div className="flex flex-wrap gap-2">
              {levels
                .slice()
                .sort((a, b) => (a.level_order ?? 0) - (b.level_order ?? 0))
                .map((l) => (
                  <button key={l.id} type="button" onClick={() => setEditingLevel(l)}>
                    <Badge variant={l.code ? "royal" : "neutral"}>
                      {l.name} {l.code ? `— ${l.code}` : "— no code"}
                    </Badge>
                  </button>
                ))}
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={open} onClose={() => setOpen(false)} title="Add academic level">
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <div>
            <Label htmlFor="level-name">Name</Label>
            <Input id="level-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="level-order">Display order</Label>
            <Input
              id="level-order"
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="level-code">Code</Label>
            <Input
              id="level-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="PRI"
              maxLength={20}
            />
            <p className="mt-1 text-xs text-ink-500">Used in student IDs for this level, e.g. ZIVA/PRI/26/0001.</p>
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Adding..." : "Add level"}
          </Button>
        </form>
      </Dialog>

      {editingLevel && (
        <EditLevelCodeDialog
          level={editingLevel}
          onClose={() => setEditingLevel(null)}
          onSaved={(updatedCode) => {
            setLevels((prev) => prev.map((l) => (l.id === editingLevel.id ? { ...l, code: updatedCode } : l)));
            setEditingLevel(null);
          }}
          onDeleted={() => {
            setLevels((prev) => prev.filter((l) => l.id !== editingLevel.id));
            setEditingLevel(null);
          }}
        />
      )}
    </Card>
  );
}

function EditLevelCodeDialog({
  level,
  onClose,
  onSaved,
  onDeleted,
}: {
  level: AcademicLevel;
  onClose: () => void;
  onSaved: (code: string | null) => void;
  onDeleted: () => void;
}) {
  const [code, setCode] = useState(level.code ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await updateAcademicLevel(level.id, { code });
    setBusy(false);
    if (result.success) {
      onSaved(code.trim().toUpperCase() || null);
    } else {
      setError(result.error);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete academic level "${level.name}"? This can't be undone.`)) return;
    setError(null);
    setDeleting(true);
    const result = await deleteAcademicLevel(level.id);
    setDeleting(false);
    if (result.success) {
      onDeleted();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open onClose={onClose} title={`Code for ${level.name}`}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <Label htmlFor="edit-level-code">Code</Label>
          <Input id="edit-level-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="PRI" maxLength={20} />
          <p className="mt-1 text-xs text-ink-500">Used in student IDs for this level, e.g. ZIVA/PRI/26/0001.</p>
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Saving..." : "Save code"}
        </Button>
        <Button type="button" variant="danger" className="w-full" onClick={handleDelete} disabled={deleting}>
          <Trash2 className="h-4 w-4" /> {deleting ? "Deleting..." : "Delete level"}
        </Button>
      </form>
    </Dialog>
  );
}

// ---------------- Academic Years ----------------

function YearsCard({
  years,
  setYears,
}: {
  years: AcademicYear[];
  setYears: React.Dispatch<React.SetStateAction<AcademicYear[]>>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [termsYear, setTermsYear] = useState<AcademicYear | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Academic Years</CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add year
        </Button>
      </CardHeader>
      <CardContent>
        {years.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="No academic years yet"
            description="Add your first academic year to start configuring terms, classes, and enrollments."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Start</TH>
                <TH>End</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {years.map((y) => (
                <TR key={y.id}>
                  <TD className="font-medium text-navy-900">{y.name}</TD>
                  <TD>{y.start_date}</TD>
                  <TD>{y.end_date}</TD>
                  <TD>
                    {y.is_current ? (
                      <Badge variant="success">Current</Badge>
                    ) : (
                      <Badge variant="neutral">Inactive</Badge>
                    )}
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setTermsYear(y)}>
                        Terms
                      </Button>
                      {!y.is_current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await setCurrentAcademicYear(y.id);
                            setYears((prev) =>
                              prev.map((yy) => ({ ...yy, is_current: yy.id === y.id }))
                            );
                          }}
                          title="Set as current year"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!confirm(`Delete academic year "${y.name}"?`)) return;
                          const result = await deleteAcademicYear(y.id);
                          if (result.success) {
                            setYears((prev) => prev.filter((yy) => yy.id !== y.id));
                          } else {
                            alert(result.error);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-error" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>

      <AddYearDialog open={addOpen} onClose={() => setAddOpen(false)} />
      {termsYear && <TermsDialog year={termsYear} onClose={() => setTermsYear(null)} />}
    </Card>
  );
}

function AddYearDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await createAcademicYear({ name, start_date: start, end_date: end });
    setBusy(false);
    if (result.success) {
      window.location.reload();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add academic year" description="e.g. 2025/2026">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <Label htmlFor="year-name">Name</Label>
          <Input
            id="year-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="2025/2026"
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="year-start">Start date</Label>
            <Input id="year-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="year-end">End date</Label>
            <Input id="year-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </div>
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Adding..." : "Add academic year"}
        </Button>
      </form>
    </Dialog>
  );
}

function TermsDialog({ year, onClose }: { year: AcademicYear; onClose: () => void }) {
  const [terms, setTerms] = useState<Term[] | null>(null);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setTerms(await listTerms(year.id));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await createTerm({ academic_year_id: year.id, name, start_date: start, end_date: end });
    setBusy(false);
    if (result.success) {
      setName("");
      setStart("");
      setEnd("");
      await load();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open onClose={onClose} title={`Terms — ${year.name}`}>
      <div className="space-y-4">
        {terms === null ? (
          <p className="text-sm text-ink-500">Loading...</p>
        ) : terms.length === 0 ? (
          <p className="text-sm text-ink-500">No terms added yet for this year.</p>
        ) : (
          <ul className="divide-y divide-gray-300 rounded border border-gray-300">
            {terms.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="font-medium text-navy-900">{t.name}</span>
                  <span className="text-ink-500">
                    {t.start_date} – {t.end_date}
                  </span>
                  {t.is_current && <Badge variant="success">Current</Badge>}
                </span>
                <div className="flex gap-1">
                  {!t.is_current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await setCurrentTerm(t.id, year.id);
                        await load();
                      }}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!confirm(`Delete term "${t.name}"?`)) return;
                      const result = await deleteTerm(t.id);
                      if (result.success) await load();
                      else alert(result.error);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-error" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={submit} className="space-y-3 border-t border-gray-300 pt-4">
          {error && <Alert variant="error">{error}</Alert>}
          <div>
            <Label htmlFor="term-name">Term name</Label>
            <Input
              id="term-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Term 1"
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="term-start">Start</Label>
              <Input id="term-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="term-end">End</Label>
              <Input id="term-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Adding..." : "Add term"}
          </Button>
        </form>
      </div>
    </Dialog>
  );
}
