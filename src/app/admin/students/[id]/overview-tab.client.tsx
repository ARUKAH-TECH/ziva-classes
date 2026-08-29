"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  setStudentStatus,
  updateStudent,
  enrollStudent,
  type StudentDetail,
  type CurrentEnrollment,
} from "@/lib/actions/students";
import type { AttendanceSummary } from "@/lib/actions/attendance";
import type { StudentPerformanceSummary } from "@/lib/actions/scores";
import type { ClassRow } from "@/lib/actions/classes";
import type { AcademicYear } from "@/lib/actions/academic-years";

const PENDING_MODULES = [
  { label: "Teacher Feedback / Educational Needs", note: "Available once Student Support (Phase 8) is built." },
];

export function OverviewTab({
  student,
  enrollment,
  attendance,
  performance,
  classes,
  currentYear,
}: {
  student: StudentDetail;
  enrollment: CurrentEnrollment | null;
  attendance: AttendanceSummary;
  performance: StudentPerformanceSummary;
  classes: ClassRow[];
  currentYear: AcademicYear | null;
}) {
  const [status, setStatus] = useState(student.status);
  const [busy, setBusy] = useState(false);

  const [selectedClassId, setSelectedClassId] = useState(enrollment?.class_id ?? "");
  const [classBusy, setClassBusy] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);

  async function changeClass(classId: string) {
    if (!currentYear || !classId) return;
    setClassError(null);
    setClassBusy(true);
    const result = await enrollStudent(student.id, classId, currentYear.id);
    setClassBusy(false);
    if (result.success) {
      // A class change can affect subject eligibility (Subjects tab) and,
      // for JHS/SHS, student-login eligibility (Account tab) — both are
      // server-fetched props on other tabs, so a full reload keeps every
      // tab consistent rather than just this one's local state.
      window.location.reload();
    } else {
      setSelectedClassId(enrollment?.class_id ?? "");
      setClassError(result.error);
    }
  }

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: student.first_name,
    middle_name: student.middle_name ?? "",
    last_name: student.last_name,
    date_of_birth: student.date_of_birth ?? "",
    gender: student.gender ?? "",
    phone: student.phone ?? "",
    email: student.email ?? "",
  });
  const [current, setCurrent] = useState(form);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function changeStatus(newStatus: string) {
    setBusy(true);
    const result = await setStudentStatus(student.id, newStatus);
    setBusy(false);
    if (result.success) setStatus(newStatus);
    else alert(result.error);
  }

  async function saveEdit() {
    setEditError(null);
    setSaving(true);
    const result = await updateStudent(student.id, form);
    setSaving(false);
    if (result.success) {
      setCurrent(form);
      setEditing(false);
    } else {
      setEditError(result.error);
    }
  }

  function cancelEdit() {
    setForm(current);
    setEditError(null);
    setEditing(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Profile</CardTitle>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              {editError && <Alert variant="error">{editError}</Alert>}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="edit-first-name">First name</Label>
                  <Input
                    id="edit-first-name"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-middle-name">Middle name</Label>
                  <Input
                    id="edit-middle-name"
                    value={form.middle_name}
                    onChange={(e) => setForm({ ...form, middle_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-last-name">Last name</Label>
                  <Input
                    id="edit-last-name"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-dob">Date of birth</Label>
                  <Input
                    id="edit-dob"
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-gender">Gender</Label>
                  <Select
                    id="edit-gender"
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  >
                    <option value="">—</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveEdit} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
                <Button variant="ghost" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Student number" value={student.student_number} mono />
              <Field label="Date of birth" value={current.date_of_birth || "—"} />
              <Field label="Gender" value={current.gender || "—"} />
              <Field label="Phone" value={current.phone || "—"} />
              <Field label="Email" value={current.email || "—"} />
              <Field
                label="Enrollment source"
                value={student.enrollment_source === "SOCIAL_MEDIA" ? "Social Media" : "In-Person"}
              />
              <div>
                <Label htmlFor="class-select">Class</Label>
                <Select
                  id="class-select"
                  value={selectedClassId}
                  disabled={classBusy || !currentYear}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedClassId(value);
                    changeClass(value);
                  }}
                  className="max-w-[220px]"
                >
                  {!enrollment && <option value="">Select a class…</option>}
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.academic_level_name}
                    </option>
                  ))}
                </Select>
                {!currentYear && (
                  <p className="mt-1 text-xs text-error">Set a current academic year in Settings first.</p>
                )}
                {classError && <p className="mt-1 text-xs text-error">{classError}</p>}
              </div>
              <Field label="Academic year" value={enrollment?.academic_year_name ?? currentYear?.name ?? "—"} />
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={status}
                  disabled={busy}
                  onChange={(e) => changeStatus(e.target.value)}
                  className="max-w-[180px]"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="GRADUATED">Graduated</option>
                  <option value="WITHDRAWN">Withdrawn</option>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Field
            label="Overall"
            value={attendance.percentage !== null ? `${attendance.percentage}%` : "No sessions yet"}
          />
          <Field label="Present" value={String(attendance.present)} />
          <Field label="Absent" value={String(attendance.absent)} />
          <Field label="Late" value={String(attendance.late)} />
          <Field label="Excused" value={String(attendance.excused)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academic Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {performance.subject_averages.length === 0 ? (
            <p className="text-sm text-ink-500">No scores recorded yet.</p>
          ) : (
            <>
              <div className="mb-4">
                <Field
                  label="Overall average"
                  value={performance.overall_average !== null ? `${performance.overall_average}%` : "—"}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {performance.subject_averages.map((s) => (
                  <div key={s.subject_name} className="rounded border border-gray-300 px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{s.subject_name}</p>
                    <p className="text-sm font-semibold text-navy-900">{s.average_percentage}%</p>
                    <p className="text-xs text-ink-500">{s.assessment_count} assessment(s)</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coming in later phases</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-ink-500">
            These sections of the student profile depend on modules not built yet — shown here so nothing is
            silently missing.
          </p>
          <ul className="space-y-2">
            {PENDING_MODULES.map((m) => (
              <li key={m.label} className="flex items-center justify-between rounded border border-gray-300 px-3 py-2 text-sm">
                <span className="font-medium text-navy-900">{m.label}</span>
                <Badge variant="neutral">{m.note}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-0.5 text-sm text-navy-900 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
