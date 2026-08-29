import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { listMySessionsForDate } from "@/lib/actions/sessions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function TeacherAttendancePage() {
  const date = today();
  const sessions = await listMySessionsForDate(date);

  return (
    <div className="space-y-6">
      <div>
        <h1>Attendance</h1>
        <p className="mt-1 text-sm text-ink-500">Today&apos;s sessions — {date}</p>
      </div>

      <Card>
        <CardContent>
          {sessions.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No sessions today"
              description="Nothing scheduled for today yet. This depends on your school admin setting up a weekly timetable and generating today's sessions from it — ask them if this seems wrong for an ordinary school day."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Time</TH>
                  <TH>Class</TH>
                  <TH>Subject</TH>
                  <TH>Type</TH>
                  <TH>Attendance</TH>
                  <TH className="text-right">Action</TH>
                </TR>
              </THead>
              <TBody>
                {sessions.map((s) => (
                  <TR key={s.id}>
                    <TD>
                      {s.start_time}–{s.end_time}
                    </TD>
                    <TD className="font-medium text-navy-900">{s.class_name}</TD>
                    <TD>{s.subject_name}</TD>
                    <TD>
                      <Badge variant="neutral">{s.session_type.replace("_", " ")}</Badge>
                    </TD>
                    <TD>
                      {s.attendance_taken ? (
                        <Badge variant="success">Taken</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </TD>
                    <TD className="text-right">
                      <Link href={`/teacher/attendance/${s.id}`}>
                        <Button variant="ghost" size="sm">
                          {s.attendance_taken ? "View / edit" : "Take attendance"}
                        </Button>
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
