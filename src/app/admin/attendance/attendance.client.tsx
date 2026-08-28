"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, ClipboardCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { listSessionsForDate, generateSessionsForDate, type SessionRow } from "@/lib/actions/sessions";

function shiftDate(date: string, days: number) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function AttendanceClient({
  initialDate,
  initialSessions,
}: {
  initialDate: string;
  initialSessions: SessionRow[];
}) {
  const [date, setDate] = useState(initialDate);
  const [sessions, setSessions] = useState(initialSessions);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function loadDate(newDate: string) {
    setDate(newDate);
    setLoading(true);
    setSessions(await listSessionsForDate(newDate));
    setLoading(false);
  }

  async function generate() {
    setGenerating(true);
    const result = await generateSessionsForDate(date);
    setGenerating(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    if (result.data.created === 0) {
      alert("No new sessions to generate — either none scheduled for this day, or they already exist.");
    }
    setSessions(await listSessionsForDate(date));
  }

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => loadDate(shiftDate(date, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input type="date" value={date} onChange={(e) => loadDate(e.target.value)} className="w-auto" />
            <Button variant="ghost" size="sm" onClick={() => loadDate(shiftDate(date, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" variant="secondary" onClick={generate} disabled={generating}>
            <RefreshCw className="h-4 w-4" /> {generating ? "Generating..." : "Generate sessions from schedule"}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-ink-500">Loading...</p>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No sessions on this date"
            description="Use 'Generate sessions from schedule' to create today's sessions from your recurring timetable, or add one manually from Timetable."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Time</TH>
                <TH>Class</TH>
                <TH>Subject</TH>
                <TH>Teacher</TH>
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
                  <TD>{s.teacher_name}</TD>
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
                    <Link href={`/admin/attendance/${s.id}`}>
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
  );
}
