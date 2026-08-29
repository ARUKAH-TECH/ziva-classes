import { CalendarClock } from "lucide-react";
import { listMySchedule } from "@/lib/actions/schedules";
import { DAYS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export default async function TeacherTimetablePage() {
  const schedule = await listMySchedule();
  const byDay = DAYS.map((day, i) => ({
    day,
    rows: schedule.filter((s) => s.day_of_week === i).sort((a, b) => a.start_time.localeCompare(b.start_time)),
  })).filter((d) => d.rows.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1>My Timetable</h1>
        <p className="mt-1 text-sm text-ink-500">Your recurring weekly teaching schedule.</p>
      </div>

      <Card>
        <CardContent>
          {byDay.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No schedule yet"
              description="Your admin hasn't added any recurring class times for you yet."
            />
          ) : (
            <div className="space-y-6">
              {byDay.map((d) => (
                <div key={d.day}>
                  <h3 className="mb-2 text-sm font-semibold text-navy-900">{d.day}</h3>
                  <Table>
                    <THead>
                      <TR>
                        <TH>Time</TH>
                        <TH>Class</TH>
                        <TH>Subject</TH>
                        <TH>Type</TH>
                        <TH>Location</TH>
                        <TH>Students</TH>
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
                          <TD>
                            <Badge variant="neutral">{s.session_type.replace("_", " ")}</Badge>
                          </TD>
                          <TD>{s.location ?? "—"}</TD>
                          <TD className="max-w-[220px]">
                            {s.students.length === 0 ? "—" : s.students.map((st) => st.name).join(", ")}
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
      </Card>
    </div>
  );
}
