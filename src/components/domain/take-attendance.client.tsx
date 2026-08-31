"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentAvatar } from "@/components/domain/student-avatar";
import { saveAttendance, type RosterEntry, type AttendanceStatus, type SessionInfo } from "@/lib/actions/attendance";
import { parsePastedSheet, matchRosterRow, type ImportField } from "@/lib/bulk-import/parse";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; className: string }[] = [
  { value: "PRESENT", label: "Present", className: "bg-success text-white border-success" },
  { value: "ABSENT", label: "Absent", className: "bg-error text-white border-error" },
  { value: "LATE", label: "Late", className: "bg-warning text-white border-warning" },
  { value: "EXCUSED", label: "Excused", className: "bg-sky-400 text-white border-sky-400" },
];

const PASTE_FIELDS: ImportField[] = [
  { key: "student", label: "Student", required: true },
  { key: "status", label: "Status", required: true },
  { key: "remarks", label: "Remarks" },
];

function mapAttendanceStatus(value: string): AttendanceStatus | null {
  const norm = value.trim().toLowerCase();
  if (norm === "present") return "PRESENT";
  if (norm === "absent") return "ABSENT";
  if (norm === "late") return "LATE";
  if (norm === "excused") return "EXCUSED";
  return null;
}

export function TakeAttendance({
  session,
  initialRoster,
  backHref,
}: {
  session: SessionInfo;
  initialRoster: RosterEntry[];
  backHref: string;
}) {
  const [roster, setRoster] = useState(initialRoster);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteResult, setPasteResult] = useState<{ matched: number; unmatched: string[] } | null>(null);

  function setStatus(studentId: string, status: AttendanceStatus) {
    setRoster((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, status } : r)));
  }

  function markAllPresent() {
    setRoster((prev) => prev.map((r) => ({ ...r, status: r.status ?? "PRESENT" })));
  }

  function applyPaste() {
    const parsed = parsePastedSheet<{ student: string; status: string; remarks: string }>(pasteText, PASTE_FIELDS);
    const unmatched: string[] = [];
    let matched = 0;

    setRoster((prev) => {
      const next = [...prev];
      for (const row of parsed.rows) {
        if (!row.student.trim()) continue;
        const entry = matchRosterRow(next, row.student);
        if (!entry) {
          unmatched.push(row.student);
          continue;
        }
        const status = mapAttendanceStatus(row.status);
        if (!status) {
          unmatched.push(`${row.student} (status "${row.status}" not recognized)`);
          continue;
        }
        const idx = next.findIndex((r) => r.student_id === entry.student_id);
        next[idx] = { ...next[idx], status, remarks: row.remarks.trim() || next[idx].remarks };
        matched++;
      }
      return next;
    });

    setPasteResult({ matched, unmatched });
  }

  async function save() {
    setSaving(true);
    const result = await saveAttendance(
      session.id,
      roster.map((r) => ({ student_id: r.student_id, status: r.status ?? "ABSENT", remarks: r.remarks ?? "" }))
    );
    setSaving(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    setSaved(true);
  }

  const counts = {
    total: roster.length,
    present: roster.filter((r) => r.status === "PRESENT").length,
    absent: roster.filter((r) => r.status === "ABSENT").length,
    late: roster.filter((r) => r.status === "LATE").length,
    excused: roster.filter((r) => r.status === "EXCUSED").length,
    unset: roster.filter((r) => !r.status).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href={backHref} className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1>
          {session.subject_name} — {session.class_name}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {session.session_date} · {session.start_time}–{session.end_time} ·{" "}
          <Badge variant="neutral">{session.session_type.replace("_", " ")}</Badge>
          {session.location && ` · ${session.location}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatBox label="Total" value={counts.total} />
        <StatBox label="Present" value={counts.present} accent="success" />
        <StatBox label="Absent" value={counts.absent} accent="error" />
        <StatBox label="Late" value={counts.late} accent="warning" />
        <StatBox label="Excused" value={counts.excused} accent="sky" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Paste from spreadsheet</CardTitle>
          <Button type="button" variant="secondary" size="sm" onClick={() => setPasteOpen((v) => !v)}>
            {pasteOpen ? "Hide" : "Paste attendance"}
          </Button>
        </CardHeader>
        {pasteOpen && (
          <CardContent className="space-y-3">
            <p className="text-sm text-ink-500">
              Columns: Student (name or Student ID), Status (Present/Absent/Late/Excused), Remarks (optional).
            </p>
            <Textarea
              rows={6}
              placeholder={"Student\tStatus\tRemarks\nAkosua Boateng\tPresent\t\nKwame Osei\tAbsent\tSick"}
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setPasteResult(null);
              }}
            />
            <Button type="button" variant="secondary" onClick={applyPaste} disabled={!pasteText.trim()}>
              Fill roster from paste
            </Button>
            {pasteResult && (
              <Alert variant={pasteResult.unmatched.length > 0 ? "warning" : "success"}>
                {pasteResult.matched} row{pasteResult.matched === 1 ? "" : "s"} applied.
                {pasteResult.unmatched.length > 0 && ` Not matched: ${pasteResult.unmatched.join(", ")}`}
              </Alert>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Roster</CardTitle>
          <Button variant="secondary" size="sm" onClick={markAllPresent}>
            Mark all present
          </Button>
        </CardHeader>
        <CardContent>
          {roster.length === 0 ? (
            <p className="text-sm text-ink-500">No students are enrolled in this subject.</p>
          ) : (
            <ul className="divide-y divide-gray-300">
              {roster.map((r) => (
                <li key={r.student_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <StudentAvatar url={r.photo_url} name={`${r.first_name} ${r.last_name}`} size={36} />
                    <span className="font-medium text-navy-900">
                      {r.first_name} {r.last_name}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStatus(r.student_id, opt.value)}
                        className={cn(
                          "rounded border px-2.5 py-1 text-xs font-medium transition-colors",
                          r.status === opt.value
                            ? opt.className
                            : "border-gray-300 bg-white text-ink-500 hover:bg-gray-100"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving || roster.length === 0}>
          {saving ? "Saving..." : "Save attendance"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-success">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
        {counts.unset > 0 && !saved && (
          <span className="text-sm text-warning">{counts.unset} student(s) not yet marked</span>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: number; accent?: "success" | "error" | "warning" | "sky" }) {
  const color = accent
    ? { success: "text-success", error: "text-error", warning: "text-warning", sky: "text-sky-400" }[accent]
    : "text-navy-900";
  return (
    <Card className="px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className={cn("text-xl font-semibold", color)}>{value}</p>
    </Card>
  );
}
