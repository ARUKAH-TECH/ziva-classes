import { notFound } from "next/navigation";
import { getLibraryEntry } from "@/lib/actions/lesson-plan-library";
import { LibraryEntryReview } from "./detail.client";

export default async function AdminLibraryEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await getLibraryEntry(id);
  if (!entry) notFound();

  return (
    <div className="space-y-6">
      <LibraryEntryReview entry={entry} />
    </div>
  );
}
