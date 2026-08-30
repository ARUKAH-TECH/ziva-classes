import "server-only";
import { createClient } from "@/lib/supabase/server";
import { lookupGrade } from "@/lib/grading";
import { getStudentAttendanceSummaryForTerm, type AttendanceSummary } from "@/lib/actions/attendance";

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

// CA = continuous assessment / class work (everything that isn't the term's
// final exam). ca_percentage and exam_percentage are each a 0-100 average
// within their own type; subject_average_percentage is the BECE-style Total
// built from those two (see computeSubjectAverages).
const CA_ASSESSMENT_TYPES = new Set(["ASSIGNMENT", "QUIZ", "TEST", "PROJECT"]);

export interface ReportSubject {
  subject_name: string;
  teacher_name: string;
  assessments: { name: string; assessment_type: string; score: number; maximum_score: number; percentage: number }[];
  // Class work (CA-type assessments) and exam performance, each scaled down
  // to a mark out of 50 — BECE-style 50/50 split — then summed into
  // subject_average_percentage as the subject's Total out of 100. See
  // computeSubjectAverages for the scaling.
  class_work_scaled: number | null;
  exam_scaled: number | null;
  subject_average_percentage: number | null;
  subject_grade: string | null;
  teacher_comment: string | null;
  ca_percentage: number | null;
  exam_percentage: number | null;
}

export type FeeStatus = "CLEARED" | "PARTIALLY_PAID" | "OUTSTANDING" | "NO_CHARGES";

export interface TerminalReportPayload {
  student: {
    id: string;
    student_number: string;
    first_name: string;
    last_name: string;
    passport_photo_path: string | null;
  };
  class_name: string;
  academic_level_id: string;
  academic_level_name: string;
  parent_names: string[];
  academic_year_id: string;
  academic_year_name: string;
  term_id: string;
  term_name: string;
  term_start_date: string;
  report_date: string;

  subjects: ReportSubject[];
  overall_average: number | null;
  overall_grade: string | null;
  overall_total_score: number;
  overall_total_possible: number;

  subject_count: number;
  strongest_subject: string | null;
  areas_for_improvement: string[];
  ranking_enabled: boolean;
  position: number | null;
  class_size: number | null;

  attendance: AttendanceSummary;

  fee_status: FeeStatus;
}

async function computeSubjectAverages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  termId: string,
  academicYearId: string
): Promise<{ subjects: ReportSubject[]; overallAverage: number | null }> {
  // Scoped to the report's academic year — otherwise subjects the student
  // was enrolled in during other years would leak into this report.
  const { data: enrolledSubjects } = await supabase
    .from("student_subjects")
    .select("class_subject_id, class_subjects(subjects(name))")
    .eq("student_id", studentId)
    .eq("academic_year_id", academicYearId);

  type Nested = { name: string } | { name: string }[] | null;
  type ES = { class_subject_id: string; class_subjects: { subjects: Nested } | { subjects: Nested }[] | null };

  const subjectList = (enrolledSubjects as ES[]) ?? [];
  const subjects: ReportSubject[] = [];

  for (const es of subjectList) {
    const subjectName = one(one(es.class_subjects)?.subjects ?? null)?.name ?? "—";

    const { data: teacherAssignment } = await supabase
      .from("teacher_assignments")
      .select("teacher_profiles(users(first_name, last_name))")
      .eq("class_subject_id", es.class_subject_id)
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
    const teacher = one(
      (teacherAssignment as { teacher_profiles: { users: U } | { users: U }[] | null } | null)?.teacher_profiles ?? null
    )?.users;
    const teacherName = one(teacher ?? null) ? `${one(teacher ?? null)!.first_name} ${one(teacher ?? null)!.last_name}` : "—";

    const { data: scores } = await supabase
      .from("scores")
      .select("score, teacher_comment, assessments!inner(name, assessment_type, maximum_score, term_id, class_subject_id, assessment_date)")
      .eq("student_id", studentId)
      .eq("assessments.class_subject_id", es.class_subject_id)
      .eq("assessments.term_id", termId);

    type A = { name: string; assessment_type: string; maximum_score: number; assessment_date: string | null };
    type ScoreRaw = { score: number; teacher_comment: string | null; assessments: A | A[] | null };

    const assessmentRows = (scores as ScoreRaw[]) ?? [];
    const assessments = assessmentRows
      .map((s) => {
        const a = one(s.assessments);
        if (!a || a.maximum_score <= 0) return null;
        return {
          name: a.name,
          assessment_type: a.assessment_type,
          score: s.score,
          maximum_score: a.maximum_score,
          percentage: Math.round((s.score / a.maximum_score) * 1000) / 10,
          date: a.assessment_date ?? "",
          comment: s.teacher_comment,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    const average = (rows: typeof assessments) =>
      rows.length > 0 ? Math.round((rows.reduce((sum, a) => sum + a.percentage, 0) / rows.length) * 10) / 10 : null;

    const caPercentage = average(assessments.filter((a) => CA_ASSESSMENT_TYPES.has(a.assessment_type)));
    const examPercentage = average(assessments.filter((a) => a.assessment_type === "EXAMINATION"));

    // BECE-style 50/50 split: class work (out of its own max, e.g. 60) and
    // the exam (out of its own max, e.g. 100) are each already normalized to
    // a 0-100 percentage above, so scaling either down to a mark out of 50
    // is just halving that percentage. The subject Total only exists once
    // both halves are in — a subject with only class work entered isn't
    // graded yet.
    const classWorkScaled = caPercentage !== null ? Math.round(caPercentage * 0.5 * 10) / 10 : null;
    const examScaled = examPercentage !== null ? Math.round(examPercentage * 0.5 * 10) / 10 : null;
    const subjectTotal =
      classWorkScaled !== null && examScaled !== null ? Math.round((classWorkScaled + examScaled) * 10) / 10 : null;

    const latestComment = assessments.length > 0 ? assessments[assessments.length - 1].comment : null;

    subjects.push({
      subject_name: subjectName,
      teacher_name: teacherName,
      assessments: assessments.map(({ name, assessment_type, score, maximum_score, percentage }) => ({
        name,
        assessment_type,
        score,
        maximum_score,
        percentage,
      })),
      class_work_scaled: classWorkScaled,
      exam_scaled: examScaled,
      subject_average_percentage: subjectTotal,
      subject_grade: null, // filled in by caller once academic_level_id is known
      teacher_comment: latestComment,
      ca_percentage: caPercentage,
      exam_percentage: examPercentage,
    });
  }

  const graded = subjects.filter((s) => s.subject_average_percentage !== null);
  const overallAverage =
    graded.length > 0
      ? Math.round((graded.reduce((sum, s) => sum + (s.subject_average_percentage ?? 0), 0) / graded.length) * 10) / 10
      : null;

  return { subjects, overallAverage };
}

export async function computeTerminalReport(
  studentId: string,
  termId: string,
  options?: { rankingEnabled?: boolean }
): Promise<TerminalReportPayload | null> {
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, student_number, first_name, last_name, passport_photo_path, organization_id")
    .eq("id", studentId)
    .single();

  if (!student) return null;
  const s = student as {
    id: string;
    student_number: string;
    first_name: string;
    last_name: string;
    passport_photo_path: string | null;
    organization_id: string;
  };

  const { data: term } = await supabase
    .from("terms")
    .select("id, name, start_date, end_date, academic_year_id, academic_years(name)")
    .eq("id", termId)
    .single();

  if (!term) return null;
  type Nested = { name: string } | { name: string }[] | null;
  const t = term as { id: string; name: string; start_date: string; end_date: string; academic_year_id: string; academic_years: Nested };

  const { data: enrollment } = await supabase
    .from("student_enrollments")
    .select("class_id, classes(name, academic_level_id, academic_levels(name))")
    .eq("student_id", studentId)
    .eq("academic_year_id", t.academic_year_id)
    .limit(1)
    .maybeSingle();

  type ClassNested =
    | { name: string; academic_level_id: string; academic_levels: Nested }
    | { name: string; academic_level_id: string; academic_levels: Nested }[]
    | null;
  const cls = one((enrollment as { class_id: string; classes: ClassNested } | null)?.classes ?? null);

  const { data: parentLinks } = await supabase
    .from("parent_students")
    .select("parent_profiles(users(first_name, last_name))")
    .eq("student_id", studentId);

  type U = { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  type ParentRaw = { parent_profiles: { users: U } | { users: U }[] | null };
  const parentNames = ((parentLinks as ParentRaw[]) ?? [])
    .map((p) => one(one(p.parent_profiles)?.users ?? null))
    .filter((u): u is { first_name: string; last_name: string } => u !== null)
    .map((u) => `${u.first_name} ${u.last_name}`);

  const { subjects, overallAverage } = await computeSubjectAverages(supabase, studentId, termId, t.academic_year_id);

  const academicLevelId = cls?.academic_level_id ?? "";
  for (const subj of subjects) {
    if (subj.subject_average_percentage !== null && academicLevelId) {
      const grade = await lookupGrade(supabase, academicLevelId, subj.subject_average_percentage);
      subj.subject_grade = grade?.label ?? null;
    }
  }
  const overallGrade =
    overallAverage !== null && academicLevelId ? (await lookupGrade(supabase, academicLevelId, overallAverage))?.label ?? null : null;

  // "Total out of number of subjects" — each graded subject contributes its
  // own average as a mark out of 100, so N graded subjects gives a total
  // out of N*100. Scoped to graded subjects only (matching overall_average)
  // so a subject with no scores entered yet doesn't drag this down to look
  // like a failing total.
  const gradedForTotal = subjects.filter((s2) => s2.subject_average_percentage !== null);
  const overallTotalScore = Math.round(
    gradedForTotal.reduce((sum, s2) => sum + (s2.subject_average_percentage ?? 0), 0) * 10
  ) / 10;
  const overallTotalPossible = gradedForTotal.length * 100;

  const gradedSubjects = subjects.filter((s2) => s2.subject_average_percentage !== null);
  const strongest =
    gradedSubjects.length > 0
      ? gradedSubjects.reduce((best, s2) => (s2.subject_average_percentage! > best.subject_average_percentage! ? s2 : best))
          .subject_name
      : null;
  const areasForImprovement = gradedSubjects
    .filter((s2) => (s2.subject_average_percentage ?? 100) < 50)
    .map((s2) => s2.subject_name);

  // Ranking — only computed when requested, among classmates in the same
  // class for the same academic year, by their own overall average for
  // this term. Never assumed on by default (§23).
  let position: number | null = null;
  let classSize: number | null = null;
  const rankingEnabled = options?.rankingEnabled ?? false;

  if (rankingEnabled && enrollment) {
    const classId = (enrollment as { class_id: string }).class_id;
    const { data: classmates } = await supabase
      .from("student_enrollments")
      .select("student_id")
      .eq("class_id", classId)
      .eq("academic_year_id", t.academic_year_id)
      .eq("status", "ACTIVE");

    const classmateIds = ((classmates as { student_id: string }[]) ?? []).map((c) => c.student_id);
    classSize = classmateIds.length;

    const averages = await Promise.all(
      classmateIds.map(async (id) => {
        if (id === studentId) return { id, avg: overallAverage };
        const { overallAverage: avg } = await computeSubjectAverages(supabase, id, termId, t.academic_year_id);
        return { id, avg };
      })
    );

    const ranked = averages
      .filter((a) => a.avg !== null)
      .sort((a, b) => (b.avg as number) - (a.avg as number));
    const idx = ranked.findIndex((a) => a.id === studentId);
    position = idx >= 0 ? idx + 1 : null;
  }

  const attendance = await getStudentAttendanceSummaryForTerm(studentId, t.start_date, t.end_date);

  // Fees for this term
  const { data: charges } = await supabase
    .from("student_charges")
    .select("id, amount_due, fee_structures!inner(term_id)")
    .eq("student_id", studentId)
    .eq("fee_structures.term_id", termId);

  type ChargeRaw = { id: string; amount_due: number };
  const chargeRows = (charges as ChargeRaw[]) ?? [];
  let feeStatus: FeeStatus = "NO_CHARGES";
  if (chargeRows.length > 0) {
    const { data: allocations } = await supabase
      .from("payment_allocations")
      .select("student_charge_id, amount_allocated")
      .in("student_charge_id", chargeRows.map((c) => c.id));

    const paid = ((allocations as { amount_allocated: number }[]) ?? []).reduce((s2, a) => s2 + a.amount_allocated, 0);
    const due = chargeRows.reduce((s2, c) => s2 + c.amount_due, 0);
    feeStatus = paid <= 0 ? "OUTSTANDING" : paid >= due ? "CLEARED" : "PARTIALLY_PAID";
  }

  return {
    student: {
      id: s.id,
      student_number: s.student_number,
      first_name: s.first_name,
      last_name: s.last_name,
      passport_photo_path: s.passport_photo_path,
    },
    class_name: cls?.name ?? "—",
    academic_level_id: academicLevelId,
    academic_level_name: one(cls?.academic_levels ?? null)?.name ?? "—",
    parent_names: parentNames,
    academic_year_id: t.academic_year_id,
    academic_year_name: one(t.academic_years)?.name ?? "—",
    term_id: t.id,
    term_name: t.name,
    term_start_date: t.start_date,
    report_date: new Date().toISOString().slice(0, 10),
    subjects,
    overall_average: overallAverage,
    overall_grade: overallGrade,
    overall_total_score: overallTotalScore,
    overall_total_possible: overallTotalPossible,
    subject_count: subjects.length,
    strongest_subject: strongest,
    areas_for_improvement: areasForImprovement,
    ranking_enabled: rankingEnabled,
    position,
    class_size: classSize,
    attendance,
    fee_status: feeStatus,
  };
}
