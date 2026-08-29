import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { TerminalReportPayload } from "@/lib/reports/compute-report";
import type { ReportStatus } from "@/lib/actions/terminal-reports";

const NAVY = "#0A1F44";
const ROYAL = "#0B5FA5";
const GOLD = "#B8873C";
const INK = "#101828";
const MUTED = "#5B6472";
const BORDER = "#DCE1E8";
const SURFACE = "#F7F8FA";

const FEE_STATUS_LABEL: Record<string, string> = {
  CLEARED: "Cleared",
  PARTIALLY_PAID: "Partially Paid",
  OUTSTANDING: "Outstanding",
  NO_CHARGES: "No Charges Recorded",
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, color: INK, fontFamily: "Helvetica" },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: GOLD, paddingBottom: 10, marginBottom: 10 },
  logo: { width: 44, height: 44, borderRadius: 22 },
  headerCenter: { flex: 1, textAlign: "center" },
  orgName: { fontSize: 15, fontWeight: 700, color: NAVY },
  motto: { fontSize: 8, color: GOLD, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },
  sub: { fontSize: 7, color: MUTED, marginTop: 1 },
  identityBox: { flexDirection: "row", gap: 10, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, padding: 10, marginBottom: 12 },
  photo: { width: 60, height: 72, borderWidth: 1, borderColor: BORDER, objectFit: "cover" },
  photoPlaceholder: { width: 60, height: 72, borderWidth: 1, borderColor: BORDER, backgroundColor: "#EEF1F4", alignItems: "center", justifyContent: "center" },
  identityGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap" },
  identityCell: { width: "50%", flexDirection: "row", justifyContent: "space-between", marginBottom: 3, paddingRight: 8 },
  fieldLabel: { color: MUTED },
  fieldValue: { color: NAVY, fontWeight: 700 },
  sectionTitle: { fontSize: 9, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 10, marginBottom: 4 },
  table: { borderWidth: 1, borderColor: NAVY },
  tr: { flexDirection: "row" },
  th: { backgroundColor: NAVY, color: "#FFFFFF", padding: 4, fontSize: 8, fontWeight: 700 },
  td: { padding: 4, fontSize: 8, borderTopWidth: 1, borderTopColor: BORDER },
  colSubject: { width: "13%" },
  colAssessments: { width: "21%" },
  colCA: { width: "8%", textAlign: "right" },
  colExam: { width: "8%", textAlign: "right" },
  colAvg: { width: "9%", textAlign: "right" },
  colGrade: { width: "9%", textAlign: "center" },
  colTeacher: { width: "14%" },
  colComment: { width: "18%" },
  twoCol: { flexDirection: "row", gap: 16, marginTop: 4 },
  col: { flex: 1 },
  commentBox: { borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 6, fontSize: 8, minHeight: 24 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, fontSize: 8, fontWeight: 700 },
  signRow: { flexDirection: "row", gap: 20, marginTop: 24 },
  signBlock: { flex: 1 },
  signLine: { borderTopWidth: 1, borderTopColor: MUTED, marginTop: 20 },
  signLabel: { textAlign: "center", fontSize: 7, color: MUTED, marginTop: 2 },
  footer: { textAlign: "center", fontSize: 7, color: MUTED, marginTop: 20 },
});

function feeBadgeColor(status: string) {
  if (status === "CLEARED") return { backgroundColor: "#DCFCE7", color: "#16A34A" };
  if (status === "PARTIALLY_PAID") return { backgroundColor: "#FEF3C7", color: "#B45309" };
  if (status === "OUTSTANDING") return { backgroundColor: "#FEE2E2", color: "#DC2626" };
  return { backgroundColor: "#EEF1F4", color: MUTED };
}

export function TerminalReportPDF({
  payload,
  status,
  version,
  administratorComment,
  overallTeacherComment,
  photoDataUri,
  logoDataUri,
  orgName,
  orgMotto,
}: {
  payload: TerminalReportPayload;
  status: ReportStatus;
  version: number;
  administratorComment: string | null;
  overallTeacherComment: string | null;
  photoDataUri: string | null;
  logoDataUri: string;
  orgName: string;
  orgMotto: string;
}) {
  const feeColors = feeBadgeColor(payload.fee_status);

  return (
    <Document title={`Terminal Report - ${payload.student.first_name} ${payload.student.last_name} - ${payload.term_name}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={logoDataUri} style={styles.logo} />
          <View style={styles.headerCenter}>
            <Text style={styles.orgName}>{orgName}</Text>
            <Text style={styles.motto}>{orgMotto}</Text>
            <Text style={styles.sub}>EST. 2023 · TERMINAL REPORT{status !== "PUBLISHED" ? ` · ${status}` : ""}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.identityBox}>
          {photoDataUri ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={photoDataUri} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={{ fontSize: 7, color: MUTED }}>No Photo</Text>
            </View>
          )}
          <View style={styles.identityGrid}>
            <IdentityCell label="Student Name" value={`${payload.student.first_name} ${payload.student.last_name}`} />
            <IdentityCell label="Student ID" value={payload.student.student_number} />
            <IdentityCell label="Parent/Guardian" value={payload.parent_names.join(", ") || "—"} />
            <IdentityCell label="Class / Level" value={`${payload.class_name} (${payload.academic_level_name})`} />
            <IdentityCell label="Academic Year" value={payload.academic_year_name} />
            <IdentityCell label="Term" value={payload.term_name} />
            <IdentityCell label="Report Date" value={payload.report_date} />
            <IdentityCell label="Version" value={`v${version}`} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Academic Performance</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.th, styles.colSubject]}>Subject</Text>
            <Text style={[styles.th, styles.colAssessments]}>Assessments</Text>
            <Text style={[styles.th, styles.colCA]}>CA %</Text>
            <Text style={[styles.th, styles.colExam]}>Exam %</Text>
            <Text style={[styles.th, styles.colAvg]}>Total %</Text>
            <Text style={[styles.th, styles.colGrade]}>Grade</Text>
            <Text style={[styles.th, styles.colTeacher]}>Teacher</Text>
            <Text style={[styles.th, styles.colComment]}>Comment</Text>
          </View>
          {payload.subjects.length === 0 ? (
            <View style={styles.tr}>
              <Text style={[styles.td, { width: "100%", textAlign: "center", color: MUTED }]}>No subjects enrolled.</Text>
            </View>
          ) : (
            payload.subjects.map((s) => (
              <View style={styles.tr} key={s.subject_name}>
                <Text style={[styles.td, styles.colSubject, { fontWeight: 700 }]}>{s.subject_name}</Text>
                <Text style={[styles.td, styles.colAssessments]}>
                  {s.assessments.length === 0 ? "—" : s.assessments.map((a) => `${a.name} (${a.score}/${a.maximum_score})`).join(", ")}
                </Text>
                <Text style={[styles.td, styles.colCA]}>{s.ca_percentage !== null ? `${s.ca_percentage}%` : "—"}</Text>
                <Text style={[styles.td, styles.colExam]}>{s.exam_percentage !== null ? `${s.exam_percentage}%` : "—"}</Text>
                <Text style={[styles.td, styles.colAvg, { fontWeight: 700 }]}>
                  {s.subject_average_percentage !== null ? `${s.subject_average_percentage}%` : "—"}
                </Text>
                <Text style={[styles.td, styles.colGrade, { color: GOLD, fontWeight: 700 }]}>{s.subject_grade ?? "—"}</Text>
                <Text style={[styles.td, styles.colTeacher]}>{s.teacher_name}</Text>
                <Text style={[styles.td, styles.colComment]}>{s.teacher_comment ?? "—"}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Performance Summary</Text>
            <FieldRow label="Overall Average" value={payload.overall_average !== null ? `${payload.overall_average}%` : "—"} />
            <FieldRow label="Overall Grade" value={payload.overall_grade ?? "—"} />
            <FieldRow
              label="Total Score"
              value={
                payload.overall_total_possible > 0
                  ? `${payload.overall_total_score} out of ${payload.overall_total_possible}`
                  : "—"
              }
            />
            <FieldRow label="Number of Subjects" value={String(payload.subject_count)} />
            <FieldRow label="Strongest Subject" value={payload.strongest_subject ?? "—"} />
            <FieldRow
              label="Areas Requiring Improvement"
              value={payload.areas_for_improvement.length > 0 ? payload.areas_for_improvement.join(", ") : "None noted"}
            />
            {payload.ranking_enabled && (
              <FieldRow label="Position" value={payload.position !== null ? `${payload.position} of ${payload.class_size}` : "—"} />
            )}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Attendance</Text>
            <FieldRow label="Attendance" value={`${payload.attendance.present} out of ${payload.attendance.total_sessions}`} />
            <FieldRow label="Absent" value={String(payload.attendance.absent)} />
            <FieldRow label="Late" value={String(payload.attendance.late)} />
            <FieldRow label="Excused" value={String(payload.attendance.excused)} />
            <FieldRow
              label="Attendance Percentage"
              value={payload.attendance.percentage !== null ? `${payload.attendance.percentage}%` : "—"}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Overall Teacher Comment</Text>
        <Text style={styles.commentBox}>{overallTeacherComment || "—"}</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
          <Text style={styles.sectionTitle}>Fee Status</Text>
          <Text style={[styles.badge, feeColors]}>{FEE_STATUS_LABEL[payload.fee_status]}</Text>
        </View>

        <View style={{ borderTopWidth: 2, borderTopColor: GOLD, marginTop: 12, paddingTop: 10 }}>
          <Text style={styles.sectionTitle}>Administrator&apos;s Comment</Text>
          <Text style={styles.commentBox}>{administratorComment || "—"}</Text>

          <View style={styles.signRow}>
            <View style={styles.signBlock}>
              <View style={styles.signLine} />
              <Text style={styles.signLabel}>Authorized By</Text>
            </View>
            <View style={styles.signBlock}>
              <View style={styles.signLine} />
              <Text style={styles.signLabel}>Date</Text>
            </View>
            <View style={styles.signBlock}>
              <View style={styles.signLine} />
              <Text style={styles.signLabel}>Next Term Begins</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          This is an official ZIVA Online &amp; Special Classes academic document. {orgName} · {orgMotto}
        </Text>
      </Page>
    </Document>
  );
}

function IdentityCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.identityCell}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

// No custom font registration needed — Helvetica is a react-pdf standard
// font available without embedding.
