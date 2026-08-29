import type { LessonNoteRow } from "@/lib/actions/lesson-notes";

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="w-40 border border-gray-300 bg-surface px-2 py-1.5 align-top text-xs font-semibold text-navy-900">
        {label}
      </td>
      <td className="whitespace-pre-wrap border border-gray-300 px-2 py-1.5 text-xs text-ink-700">{value || "—"}</td>
    </tr>
  );
}

// The Ghana Education Service standard weekly lesson plan layout, rendered
// as a proper table (used both on-screen and when printed).
export function LessonPlanTable({ note }: { note: LessonNoteRow }) {
  return (
    <table className="w-full border-collapse text-xs">
      <tbody>
        <tr>
          <td className="w-40 border border-gray-300 bg-surface px-2 py-1.5 text-xs font-semibold text-navy-900">
            Week
          </td>
          <td className="border border-gray-300 px-2 py-1.5 text-xs text-ink-700">{note.week_number ?? "—"}</td>
          <td className="w-32 border border-gray-300 bg-surface px-2 py-1.5 text-xs font-semibold text-navy-900">
            Class
          </td>
          <td className="border border-gray-300 px-2 py-1.5 text-xs text-ink-700">{note.class_name}</td>
        </tr>
        <tr>
          <td className="border border-gray-300 bg-surface px-2 py-1.5 text-xs font-semibold text-navy-900">
            Week Ending
          </td>
          <td className="border border-gray-300 px-2 py-1.5 text-xs text-ink-700">{fmt(note.week_ending)}</td>
          <td className="border border-gray-300 bg-surface px-2 py-1.5 text-xs font-semibold text-navy-900">
            Subject
          </td>
          <td className="border border-gray-300 px-2 py-1.5 text-xs text-ink-700">{note.subject_name}</td>
        </tr>
        <tr>
          <td className="border border-gray-300 bg-surface px-2 py-1.5 text-xs font-semibold text-navy-900">Day</td>
          <td className="border border-gray-300 px-2 py-1.5 text-xs text-ink-700">{note.day_name ?? "—"}</td>
          <td className="border border-gray-300 bg-surface px-2 py-1.5 text-xs font-semibold text-navy-900">Date</td>
          <td className="border border-gray-300 px-2 py-1.5 text-xs text-ink-700">{fmt(note.lesson_date)}</td>
        </tr>
      </tbody>
      <tbody>
        <Row label="Strand" value={note.strand} />
        <Row label="Sub-Strand" value={note.sub_strand} />
        <Row label="Indicator" value={note.indicator} />
        <Row label="Content Standard" value={note.content_standard} />
        <Row label="Performance Indicator" value={note.performance_indicator} />
        <Row label="Core Competencies" value={note.core_competencies ?? ""} />
        <Row label="Key Words" value={note.keywords ?? ""} />
        <Row label="Teaching / Learning Resource" value={note.teaching_learning_resources ?? ""} />
        <Row label="Reference" value={note.reference ?? ""} />
      </tbody>
      <tbody>
        <tr>
          <td
            colSpan={4}
            className="border border-gray-300 bg-navy-900 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Phase 1 (Starter)
          </td>
        </tr>
        <tr>
          <td colSpan={4} className="whitespace-pre-wrap border border-gray-300 px-2 py-2 text-xs text-ink-700">
            {note.phase1_starter}
          </td>
        </tr>
        <tr>
          <td
            colSpan={4}
            className="border border-gray-300 bg-navy-900 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Phase 2 (Main Lesson)
          </td>
        </tr>
        <tr>
          <td colSpan={4} className="whitespace-pre-wrap border border-gray-300 px-2 py-2 text-xs text-ink-700">
            {note.phase2_main}
          </td>
        </tr>
        <tr>
          <td
            colSpan={4}
            className="border border-gray-300 bg-navy-900 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Phase 3 (Reflection)
          </td>
        </tr>
        <tr>
          <td colSpan={4} className="whitespace-pre-wrap border border-gray-300 px-2 py-2 text-xs text-ink-700">
            {note.phase3_reflection}
          </td>
        </tr>
        <tr>
          <td className="border border-gray-300 bg-surface px-2 py-1.5 text-xs font-semibold text-navy-900">
            Remarks
          </td>
          <td colSpan={3} className="whitespace-pre-wrap border border-gray-300 px-2 py-1.5 text-xs text-ink-700">
            {note.remarks || "—"}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
