import { notFound } from "next/navigation";
import { getAssessmentContext, getAssessmentRoster } from "@/lib/actions/scores";
import { EnterScores } from "@/components/domain/enter-scores.client";

export default async function TeacherEnterScoresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [assessment, roster] = await Promise.all([getAssessmentContext(id), getAssessmentRoster(id)]);

  if (!assessment) notFound();

  return <EnterScores assessment={assessment} initialRoster={roster} backHref="/teacher/assessments" />;
}
