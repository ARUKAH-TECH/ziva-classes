"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, CalendarClock } from "lucide-react";
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
  updateSchedule,
  deleteSchedule,
  setScheduleActive,
  listStudentsForClassSubject,
  type ScheduleRow,
  type ScheduleStudent,
  type ClassSubjectTeacherOption,
} from "@/lib/actions/schedules";
import { DAYS, type SessionType } from "@/lib/constants";

function StudentPicker({
  classSubjectId,
  selected,
  onChange,
}: {
  classSubjectId: string;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [options, setOptions] = useState<ScheduleStudent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOptions(null);
    if (!classSubjectId) return;
    listStudentsForClassSubject(classSubjectId).then((students) => {
      if (!cancelled) setOptions(students);
    });
    return () => {
      cancelled = true;
    };
  }, [classSubjectId]);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  if (options === null) {
    return <p className="text-xs text-ink-400">Loading students…</p>;
  }
  if (options.length === 0) {
    return (
      <p className="text-xs text-ink-400">
        No students are enrolled in this subject yet — assign them from the class page first.
      </p>
    );
  }

  return (
    <div className="max-h-32 space-y-1 overflow-y-auto rounded border border-gray-200 p-2">
      {options.map((s) => (
        <label key={s.id} className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
          {s.name}
        </label>
      ))}
    </div>
  );
}

export function TimetableClient({
  initialSchedules,
  options,
}: {
  initialSchedules: ScheduleRow[];
  options: ClassSubjectTeacherOption[];
}) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleRow | null>(null);

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
                        <TH>Students</TH>
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
                          <TD className="max-w-[220px]">
                            {s.students.length === 0 ? "—" : s.students.map((st) => st.name).join(", ")}
                          </TD>
                          <TD>
                            <Badge variant={s.active ? "success" : "neutral"}>
                              {s.active ? "Active" : "Inactive"}
                            </Badge>
                          </TD>
                          <TD className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
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
      {editing && (
        <EditScheduleDialog
          schedule={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setSchedules((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
            setEditing(null);
          }}
        />
      )}
    </Card>
  );
}

type SlotDraft = {
  day: string;
  start: string;
  end: string;
  sessionType: SessionType;
  location: string;
  studentIds: string[];
};

function newSlot(day: string): SlotDraft {
  return { day, start: "16:00", end: "17:30", sessionType: "CENTER", location: "", studentIds: [] };
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
  const [slots, setSlots] = useState<SlotDraft[]>([newSlot("1")]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [classSubjectId] = optionKey.split("|");

  useEffect(() => {
    setSlots((prev) => prev.map((s) => ({ ...s, studentIds: [] })));
    // Selections are only valid for the class/subject they were picked under.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classSubjectId]);

  function updateSlot(index: number, patch: Partial<SlotDraft>) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addDay() {
    const usedDays = new Set(slots.map((s) => s.day));
    const nextDay = DAYS.map((_, i) => String(i)).find((d) => !usedDays.has(d)) ?? "1";
    setSlots((prev) => [...prev, newSlot(nextDay)]);
  }

  function removeDay(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

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
      slots: slots.map((s) => ({
        day_of_week: parseInt(s.day, 10),
        start_time: s.start,
        end_time: s.end,
        session_type: s.sessionType,
        location: s.location,
        student_ids: s.studentIds,
      })),
    });
    setBusy(false);
    if (result.success) {
      window.location.reload();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add schedule" className="max-w-2xl">
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

        <p className="text-sm text-ink-500">
          Add one row per day this teacher meets students for this class/subject — each day can have
          its own time, location, and its own group of students (useful when different groups are met
          on different days or in different locations).
        </p>

        <div className="space-y-3">
          {slots.map((slot, i) => (
            <div key={i} className="rounded border border-gray-300 p-3">
              <div className="mb-3 flex items-center justify-between">
                <Label className="mb-0">Day {i + 1}</Label>
                {slots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDay(i)}
                    className="text-xs font-medium text-error hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`sched-day-${i}`}>Day of week</Label>
                  <Select
                    id={`sched-day-${i}`}
                    value={slot.day}
                    onChange={(e) => updateSlot(i, { day: e.target.value })}
                  >
                    {DAYS.map((d, di) => (
                      <option key={d} value={di}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`sched-type-${i}`}>Session type</Label>
                  <Select
                    id={`sched-type-${i}`}
                    value={slot.sessionType}
                    onChange={(e) => updateSlot(i, { sessionType: e.target.value as SessionType })}
                  >
                    <option value="CENTER">Center</option>
                    <option value="HOME_SERVICE">Home Service</option>
                    <option value="ONLINE">Online</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`sched-start-${i}`}>Start time</Label>
                  <Input
                    id={`sched-start-${i}`}
                    type="time"
                    value={slot.start}
                    onChange={(e) => updateSlot(i, { start: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`sched-end-${i}`}>End time</Label>
                  <Input
                    id={`sched-end-${i}`}
                    type="time"
                    value={slot.end}
                    onChange={(e) => updateSlot(i, { end: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`sched-location-${i}`}>Location (optional)</Label>
                  <Input
                    id={`sched-location-${i}`}
                    value={slot.location}
                    onChange={(e) => updateSlot(i, { location: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-3">
                <Label>Students to meet (optional)</Label>
                {classSubjectId ? (
                  <StudentPicker
                    classSubjectId={classSubjectId}
                    selected={slot.studentIds}
                    onChange={(ids) => updateSlot(i, { studentIds: ids })}
                  />
                ) : (
                  <p className="text-xs text-ink-400">Choose a class/subject first.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="secondary" size="sm" onClick={addDay} disabled={slots.length >= 7}>
          <Plus className="h-4 w-4" /> Add another day
        </Button>

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Adding..." : `Add schedule (${slots.length} day${slots.length > 1 ? "s" : ""})`}
        </Button>
      </form>
    </Dialog>
  );
}

function EditScheduleDialog({
  schedule,
  onClose,
  onSaved,
}: {
  schedule: ScheduleRow;
  onClose: () => void;
  onSaved: (updated: ScheduleRow) => void;
}) {
  const [day, setDay] = useState(String(schedule.day_of_week));
  const [start, setStart] = useState(schedule.start_time.slice(0, 5));
  const [end, setEnd] = useState(schedule.end_time.slice(0, 5));
  const [sessionType, setSessionType] = useState<SessionType>(schedule.session_type);
  const [location, setLocation] = useState(schedule.location ?? "");
  const [studentOptions, setStudentOptions] = useState<ScheduleStudent[] | null>(null);
  const [studentIds, setStudentIds] = useState<string[]>(schedule.students.map((s) => s.id));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listStudentsForClassSubject(schedule.class_subject_id).then((students) => {
      if (!cancelled) setStudentOptions(students);
    });
    return () => {
      cancelled = true;
    };
  }, [schedule.class_subject_id]);

  function toggleStudent(id: string) {
    setStudentIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await updateSchedule(schedule.id, {
      day_of_week: parseInt(day, 10),
      start_time: start,
      end_time: end,
      session_type: sessionType,
      location,
      student_ids: studentIds,
    });
    setBusy(false);
    if (result.success) {
      onSaved({
        ...schedule,
        day_of_week: parseInt(day, 10),
        start_time: start,
        end_time: end,
        session_type: sessionType,
        location: location || null,
        students: (studentOptions ?? []).filter((s) => studentIds.includes(s.id)),
      });
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open onClose={onClose} title={`Edit schedule — ${schedule.subject_name} (${schedule.class_name})`}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <Label htmlFor="edit-sched-day">Day</Label>
          <Select id="edit-sched-day" value={day} onChange={(e) => setDay(e.target.value)}>
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="edit-sched-start">Start time</Label>
            <Input id="edit-sched-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="edit-sched-end">End time</Label>
            <Input id="edit-sched-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </div>
        </div>

        <div>
          <Label htmlFor="edit-sched-type">Session type</Label>
          <Select id="edit-sched-type" value={sessionType} onChange={(e) => setSessionType(e.target.value as SessionType)}>
            <option value="CENTER">Center</option>
            <option value="HOME_SERVICE">Home Service</option>
            <option value="ONLINE">Online</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="edit-sched-location">Location (optional)</Label>
          <Input id="edit-sched-location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>

        <div>
          <Label>Students to meet (optional)</Label>
          {studentOptions === null ? (
            <p className="text-xs text-ink-400">Loading students…</p>
          ) : studentOptions.length === 0 ? (
            <p className="text-xs text-ink-400">
              No students are enrolled in this subject yet — assign them from the class page first.
            </p>
          ) : (
            <div className="max-h-32 space-y-1 overflow-y-auto rounded border border-gray-200 p-2">
              {studentOptions.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm text-ink-700">
                  <input type="checkbox" checked={studentIds.includes(s.id)} onChange={() => toggleStudent(s.id)} />
                  {s.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </Dialog>
  );
}
