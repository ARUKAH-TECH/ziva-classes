"use client";

import { useState } from "react";
import { Plus, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createSchedule,
  deleteSchedule,
  setScheduleActive,
  type ScheduleRow,
  type ClassSubjectTeacherOption,
} from "@/lib/actions/schedules";
import { DAYS, type SessionType } from "@/lib/constants";

export function TimetableClient({
  initialSchedules,
  options,
}: {
  initialSchedules: ScheduleRow[];
  options: ClassSubjectTeacherOption[];
}) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [addOpen, setAddOpen] = useState(false);

  const byDay = DAYS.map((day, i) => ({
    day,
    rows: schedules.filter((s) => s.day_of_week === i).sort((a, b) => a.start_time.localeCompare(b.start_time)),
  }));

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={() => setAddOpen(true)} disabled={options.length === 0}>
            <Plus className="h-4 w-4" /> Add schedule
          </Button>
        </div>

        {options.length === 0 && (
          <Alert variant="warning" className="mb-4">
            Assign a teacher to a class and subject first (Teachers page) before scheduling.
          </Alert>
        )}

        {schedules.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No schedule set up yet"
            description="Add recurring weekly time slots — sessions are generated from these for attendance."
          />
        ) : (
          <div className="space-y-6">
            {byDay
              .filter((d) => d.rows.length > 0)
              .map((d) => (
                <div key={d.day}>
                  <h3 className="mb-2 text-sm font-semibold text-navy-900">{d.day}</h3>
                  <Table>
                    <THead>
                      <TR>
                        <TH>Time</TH>
                        <TH>Class</TH>
                        <TH>Subject</TH>
                        <TH>Teacher</TH>
                        <TH>Type</TH>
                        <TH>Location</TH>
                        <TH>Status</TH>
                        <TH className="text-right">Actions</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {d.rows.map((s) => (
                        <TR key={s.id}>
                          <TD>
                            {s.start_time}–{s.end_time}
                          </TD>
                          <TD className="font-medium text-navy-900">{s.class_name}</TD>
                          <TD>{s.subject_name}</TD>
                          <TD>{s.teacher_name}</TD>
                          <TD>
                            <Badge variant="neutral">{s.session_type.replace("_", " ")}</Badge>
                          </TD>
                          <TD>{s.location ?? "—"}</TD>
                          <TD>
                            <Badge variant={s.active ? "success" : "neutral"}>
                              {s.active ? "Active" : "Inactive"}
                            </Badge>
                          </TD>
                          <TD className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  const result = await setScheduleActive(s.id, !s.active);
                                  if (result.success) {
                                    setSchedules((prev) =>
                                      prev.map((x) => (x.id === s.id ? { ...x, active: !s.active } : x))
                                    );
                                  } else {
                                    alert(result.error);
                                  }
                                }}
                              >
                                {s.active ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (!confirm("Delete this schedule slot?")) return;
                                  const result = await deleteSchedule(s.id);
                                  if (result.success) {
                                    setSchedules((prev) => prev.filter((x) => x.id !== s.id));
                                  } else {
                                    alert(result.error);
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              ))}
          </div>
        )}
      </CardContent>

      <AddScheduleDialog open={addOpen} onClose={() => setAddOpen(false)} options={options} />
    </Card>
  );
}

function AddScheduleDialog({
  open,
  onClose,
  options,
}: {
  open: boolean;
  onClose: () => void;
  options: ClassSubjectTeacherOption[];
}) {
  const [optionKey, setOptionKey] = useState(
    options[0] ? `${options[0].class_subject_id}|${options[0].teacher_id}` : ""
  );
  const [day, setDay] = useState("1");
  const [start, setStart] = useState("16:00");
  const [end, setEnd] = useState("17:30");
  const [sessionType, setSessionType] = useState<SessionType>("CENTER");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const [class_subject_id, teacher_id] = optionKey.split("|");
    if (!class_subject_id || !teacher_id) {
      setError("Choose a class, subject, and teacher.");
      return;
    }

    setBusy(true);
    const result = await createSchedule({
      class_subject_id,
      teacher_id,
      day_of_week: parseInt(day, 10),
      start_time: start,
      end_time: end,
      session_type: sessionType,
      location,
    });
    setBusy(false);
    if (result.success) {
      window.location.reload();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add schedule slot">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <Label htmlFor="sched-option">Class, subject &amp; teacher</Label>
          <Select id="sched-option" value={optionKey} onChange={(e) => setOptionKey(e.target.value)} required>
            {options.map((o) => (
              <option key={`${o.class_subject_id}|${o.teacher_id}`} value={`${o.class_subject_id}|${o.teacher_id}`}>
                {o.subject_name} — {o.class_name} ({o.teacher_name})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="sched-day">Day</Label>
          <Select id="sched-day" value={day} onChange={(e) => setDay(e.target.value)}>
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sched-start">Start time</Label>
            <Input id="sched-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="sched-end">End time</Label>
            <Input id="sched-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </div>
        </div>

        <div>
          <Label htmlFor="sched-type">Session type</Label>
          <Select id="sched-type" value={sessionType} onChange={(e) => setSessionType(e.target.value as SessionType)}>
            <option value="CENTER">Center</option>
            <option value="HOME_SERVICE">Home Service</option>
            <option value="ONLINE">Online</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="sched-location">Location (optional)</Label>
          <Input id="sched-location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Adding..." : "Add schedule slot"}
        </Button>
      </form>
    </Dialog>
  );
}
