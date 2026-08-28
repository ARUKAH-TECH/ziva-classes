"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  listGradingScales,
  createGradingScale,
  deleteGradingScale,
  listGradeBands,
  createGradeBand,
  deleteGradeBand,
  type GradingScale,
  type GradeBand,
} from "@/lib/actions/grading-scales";
import type { AcademicLevel } from "@/lib/actions/academic-levels";

export function GradingPanel({
  initialScales,
  levels,
}: {
  initialScales: GradingScale[];
  levels: AcademicLevel[];
}) {
  const [scales, setScales] = useState(initialScales);
  const [addOpen, setAddOpen] = useState(false);
  const [bandsScale, setBandsScale] = useState<GradingScale | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Grading scales</CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)} disabled={levels.length === 0}>
          <Plus className="h-4 w-4" /> Add scale
        </Button>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-ink-500">
          One scale per academic level, e.g. a BECE-style scale for JHS and a WASSCE-style scale for SHS. Scores are
          graded against whichever scale is active for the student&apos;s level — never hard-coded.
        </p>

        {scales.length === 0 ? (
          <EmptyState
            icon={Percent}
            title="No grading scales yet"
            description="Add a scale per academic level, then define its grade bands."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Level</TH>
                <TH>Scale name</TH>
                <TH>Grade bands</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {scales.map((s) => (
                <TR key={s.id}>
                  <TD className="font-medium text-navy-900">{s.academic_level_name}</TD>
                  <TD>{s.name}</TD>
                  <TD>{s.band_count}</TD>
                  <TD>
                    <Badge variant={s.is_active ? "success" : "neutral"}>{s.is_active ? "Active" : "Inactive"}</Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setBandsScale(s)}>
                        Manage bands
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!confirm(`Delete scale "${s.name}"?`)) return;
                          const result = await deleteGradingScale(s.id);
                          if (result.success) {
                            setScales((prev) => prev.filter((x) => x.id !== s.id));
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

      <AddScaleDialog open={addOpen} onClose={() => setAddOpen(false)} levels={levels} />
      {bandsScale && <BandsDialog scale={bandsScale} onClose={() => setBandsScale(null)} />}
    </Card>
  );
}

function AddScaleDialog({
  open,
  onClose,
  levels,
}: {
  open: boolean;
  onClose: () => void;
  levels: AcademicLevel[];
}) {
  const [levelId, setLevelId] = useState(levels[0]?.id ?? "");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await createGradingScale({ academic_level_id: levelId, name });
    setBusy(false);
    if (result.success) {
      window.location.reload();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add grading scale">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <Label htmlFor="scale-level">Academic level</Label>
          <Select id="scale-level" value={levelId} onChange={(e) => setLevelId(e.target.value)} required>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="scale-name">Scale name</Label>
          <Input
            id="scale-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="JHS BECE Scale"
            required
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Adding..." : "Add scale"}
        </Button>
      </form>
    </Dialog>
  );
}

function BandsDialog({ scale, onClose }: { scale: GradingScale; onClose: () => void }) {
  const [bands, setBands] = useState<GradeBand[] | null>(null);
  const [label, setLabel] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [remark, setRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBands(await listGradeBands(scale.id));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const minN = parseFloat(min);
    const maxN = parseFloat(max);
    if (Number.isNaN(minN) || Number.isNaN(maxN) || !label) {
      setError("Enter a label and valid min/max scores.");
      return;
    }

    setBusy(true);
    const result = await createGradeBand({
      grading_scale_id: scale.id,
      min_score: minN,
      max_score: maxN,
      grade_label: label,
      grade_point: null,
      remark,
      display_order: (bands?.length ?? 0) + 1,
    });
    setBusy(false);
    if (result.success) {
      setLabel("");
      setMin("");
      setMax("");
      setRemark("");
      await load();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open onClose={onClose} title={`Grade bands — ${scale.name}`} className="max-w-xl">
      <div className="space-y-4">
        {bands === null ? (
          <p className="text-sm text-ink-500">Loading...</p>
        ) : bands.length === 0 ? (
          <p className="text-sm text-ink-500">No bands defined yet — a score entered before you add bands saves without a letter grade.</p>
        ) : (
          <ul className="divide-y divide-gray-300 rounded border border-gray-300">
            {bands.map((b) => (
              <li key={b.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  <Badge variant="royal" className="mr-2">
                    {b.grade_label}
                  </Badge>
                  {b.min_score}–{b.max_score}%{b.remark && <span className="text-ink-500"> · {b.remark}</span>}
                </span>
                <button
                  aria-label="Delete band"
                  onClick={async () => {
                    const result = await deleteGradeBand(b.id);
                    if (result.success) await load();
                    else alert(result.error);
                  }}
                  className="rounded p-1 text-ink-500 hover:bg-gray-100 hover:text-error"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={submit} className="space-y-3 border-t border-gray-300 pt-4">
          {error && <Alert variant="error">{error}</Alert>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="band-label">Label</Label>
              <Input id="band-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="A1" required />
            </div>
            <div>
              <Label htmlFor="band-min">Min %</Label>
              <Input id="band-min" type="number" value={min} onChange={(e) => setMin(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="band-max">Max %</Label>
              <Input id="band-max" type="number" value={max} onChange={(e) => setMax(e.target.value)} required />
            </div>
          </div>
          <div>
            <Label htmlFor="band-remark">Remark (optional)</Label>
            <Input id="band-remark" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Excellent" />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Adding..." : "Add grade band"}
          </Button>
        </form>
      </div>
    </Dialog>
  );
}
