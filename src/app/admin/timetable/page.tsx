import { listSchedules, listScheduleOptions } from "@/lib/actions/schedules";
import { TimetableClient } from "./timetable.client";

export default async function TimetablePage() {
  const [schedules, options] = await Promise.all([listSchedules(), listScheduleOptions()]);

  return (
    <div className="space-y-6">
      <div>
        <h1>Timetable</h1>
        <p className="mt-1 text-sm text-ink-500">Recurring weekly schedule — sessions are generated from this.</p>
      </div>
      <TimetableClient initialSchedules={schedules} options={options} />
    </div>
  );
}
