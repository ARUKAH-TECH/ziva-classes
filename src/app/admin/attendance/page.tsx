import { listSessionsForDate } from "@/lib/actions/sessions";
import { AttendanceClient } from "./attendance.client";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function AdminAttendancePage() {
  const date = today();
  const sessions = await listSessionsForDate(date);

  return (
    <div className="space-y-6">
      <div>
        <h1>Attendance</h1>
        <p className="mt-1 text-sm text-ink-500">Session-based attendance across all classes.</p>
      </div>
      <AttendanceClient initialDate={date} initialSessions={sessions} />
    </div>
  );
}
