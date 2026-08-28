"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setStudentStatus, type StudentDetail, type CurrentEnrollment } from "@/lib/actions/students";
import type { AttendanceSummary } from "@/lib/actions/attendance";
import type { StudentPerformanceSummary } from "@/lib/actions/scores";

const PENDING_MODULES = [
  { label: "Teacher Feedback / Educational Needs", note: "Available once Student Support (Phase 8) is built." },
];

export function OverviewTab({
  student,
  enrollment,
  attendance,
  performance,
}: {
  student: StudentDetail;
  enrollment: CurrentEnrollment | null;
  attendance: AttendanceSummary;
  performance: StudentPerformanceSummary;
}) {
  const [status, setStatus] = useState(student.status);
  const [busy, setBusy] = useState(false);

  async function changeStatus(newStatus: string) {
    setBusy(true);
    const result = await setStudentStatus(student.id, newStatus);
    setBusy(false);
    if (result.success) setStatus(newStatus);
    else alert(result.error);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Student number" value={student.student_number} mono />
          <Field label="Date of birth" value={student.date_of_birth ?? "—"} />
          <Field label="Gender" value={student.gender ?? "—"} />
          <Field label="Phone" value={student.phone ?? "—"} />
          <Field label="Email" value={student.email ?? "—"} />
          <Field
            label="Enrollment source"
            value={student.enrollment_source === "SOCIAL_MEDIA" ? "Social Media" : "In-Person"}
          />
          <Field label="Class" value={enrollment?.class_name ?? "Not enrolled"} />
          <Field label="Academic year" value={enrollment?.academic_year_name ?? "—"} />
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
