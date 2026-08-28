import { notFound } from "next/navigation";
import { getSessionInfo, getSessionRoster } from "@/lib/actions/attendance";
import { TakeAttendance } from "@/components/domain/take-attendance.client";

export default async function AdminTakeAttendancePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const [session, roster] = await Promise.all([getSessionInfo(sessionId), getSessionRoster(sessionId)]);

  if (!session) notFound();

  return <TakeAttendance session={session} initialRoster={roster} backHref="/admin/attendance" />;
}
