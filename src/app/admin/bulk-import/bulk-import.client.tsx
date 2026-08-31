"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { parsePastedSheet, type ImportField, type ParsedSheet } from "@/lib/bulk-import/parse";
import type { ActionResult } from "@/lib/auth/require-admin";
import {
  bulkImportClassesAndAllocations,
  bulkImportTeachers,
  bulkImportParents,
  bulkImportStudents,
  bulkImportFees,
  bulkImportTimetable,
  bulkImportPayments,
  type BulkImportSummary,
  type ClassAllocationRow,
  type TeacherImportRow,
  type ParentImportRow,
  type StudentImportRow,
  type FeeImportRow,
  type TimetableImportRow,
  type PaymentImportRow,
} from "@/lib/actions/bulk-import";

const CLASS_FIELDS: ImportField[] = [
  { key: "class", label: "Class", required: true },
  { key: "level", label: "Level" },
  { key: "subject", label: "Subject" },
  { key: "teacher", label: "Teacher" },
];

const TEACHER_FIELDS: ImportField[] = [
  { key: "first_name", label: "First Name", required: true },
  { key: "last_name", label: "Last Name", required: true },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "employee_number", label: "Employee Number" },
  { key: "qualification", label: "Qualification" },
  { key: "specialization", label: "Specialization" },
];

const PARENT_FIELDS: ImportField[] = [
  { key: "first_name", label: "First Name", required: true },
  { key: "last_name", label: "Last Name", required: true },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "occupation", label: "Occupation" },
  { key: "address", label: "Address" },
];

const STUDENT_FIELDS: ImportField[] = [
  { key: "first_name", label: "First Name", required: true },
  { key: "middle_name", label: "Middle Name" },
  { key: "last_name", label: "Last Name", required: true },
  { key: "date_of_birth", label: "Date of Birth" },
  { key: "gender", label: "Gender" },
  { key: "class", label: "Class" },
  { key: "level", label: "Level" },
  { key: "enrollment_source", label: "Enrollment Source" },
  { key: "parent_phone", label: "Parent Phone" },
];

const FEE_FIELDS: ImportField[] = [
  { key: "class", label: "Class", required: true },
  { key: "subject", label: "Subject" },
  { key: "term", label: "Term" },
  { key: "amount", label: "Amount", required: true },
  { key: "description", label: "Description" },
];

const TIMETABLE_FIELDS: ImportField[] = [
  { key: "class", label: "Class", required: true },
  { key: "subject", label: "Subject", required: true },
  { key: "teacher", label: "Teacher" },
  { key: "day", label: "Day", required: true },
  { key: "start_time", label: "Start Time", required: true },
  { key: "end_time", label: "End Time", required: true },
  { key: "type", label: "Type" },
  { key: "location", label: "Location" },
];

const PAYMENT_FIELDS: ImportField[] = [
  { key: "student_id", label: "Student ID", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "method", label: "Method", required: true },
  { key: "reference", label: "Reference" },
  { key: "notes", label: "Notes" },
];

function ImportPanel<T>({
  fields,
  sampleRow,
  action,
  helpText,
}: {
  fields: ImportField[];
  sampleRow: string;
  action: (rows: T[]) => Promise<ActionResult<BulkImportSummary>>;
  helpText: string;
}) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedSheet<T> | null>(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<BulkImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleParse() {
    setSummary(null);
    setError(null);
    setParsed(parsePastedSheet<T>(text, fields));
  }

  async function handleImport() {
    if (!parsed) return;
    setImporting(true);
    setError(null);
    const result = await action(parsed.rows);
    setImporting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSummary(result.data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paste your data</CardTitle>
        <p className="mt-1 text-sm text-ink-500">{helpText}</p>
        <p className="mt-2 text-xs text-ink-500">
          Expected columns (any order, header row required):{" "}
          <span className="font-mono">{fields.map((f) => (f.required ? `${f.label}*` : f.label)).join(" · ")}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          rows={8}
          placeholder={sampleRow}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setParsed(null);
            setSummary(null);
            setError(null);
          }}
        />
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={handleParse} disabled={!text.trim()}>
            Parse &amp; Preview
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!parsed || parsed.rows.length === 0 || parsed.missingRequired.length > 0 || importing}
          >
            {importing ? "Importing..." : `Import ${parsed?.rows.length ?? 0} row${parsed?.rows.length === 1 ? "" : "s"}`}
          </Button>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {parsed && !summary && (
          <div className="space-y-2">
            {parsed.missingRequired.length > 0 && (
              <Alert variant="error">
                Missing required column{parsed.missingRequired.length === 1 ? "" : "s"}: {parsed.missingRequired.join(", ")}
              </Alert>
            )}
            {parsed.unmatchedHeaders.length > 0 && (
              <Alert variant="warning">
                Unrecognized column{parsed.unmatchedHeaders.length === 1 ? "" : "s"} ignored: {parsed.unmatchedHeaders.join(", ")}
              </Alert>
            )}
            {parsed.rows.length === 0 ? (
              <Alert variant="warning">No data rows found — paste a header row plus at least one row of data.</Alert>
            ) : (
              parsed.missingRequired.length === 0 && (
                <Alert variant="success">{parsed.rows.length} row{parsed.rows.length === 1 ? "" : "s"} ready to import.</Alert>
              )
            )}
          </div>
        )}

        {summary && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Badge variant="success">{summary.created} created</Badge>
              <Badge variant="neutral">{summary.skipped} skipped</Badge>
              {summary.errors > 0 && <Badge variant="error">{summary.errors} failed</Badge>}
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>Row</TH>
                  <TH>Status</TH>
                  <TH>Details</TH>
                </TR>
              </THead>
              <TBody>
                {summary.results.map((r) => (
                  <TR key={r.row}>
                    <TD>{r.row}</TD>
                    <TD>
                      <Badge variant={r.status === "error" ? "error" : r.status === "skipped" ? "neutral" : "success"}>
                        {r.status}
                      </Badge>
                    </TD>
                    <TD>{r.message}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BulkImportClient() {
  return (
    <Tabs defaultValue="classes">
      <TabsList>
        <TabsTrigger value="classes">Classes &amp; Allocation</TabsTrigger>
        <TabsTrigger value="teachers">Teachers</TabsTrigger>
        <TabsTrigger value="parents">Parents</TabsTrigger>
        <TabsTrigger value="students">Students</TabsTrigger>
        <TabsTrigger value="fees">Fees</TabsTrigger>
        <TabsTrigger value="timetable">Timetable</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
      </TabsList>

      <TabsContent value="classes">
        <ImportPanel<ClassAllocationRow>
          fields={CLASS_FIELDS}
          helpText="Registers classes, links subjects to them, and assigns a teacher — all in one row. Leave Subject/Teacher blank to just register the class. A class that doesn't exist yet is created automatically when a Level is given. Paste this first — students, fees, and timetable all reference classes by name."
          sampleRow={"Class\tLevel\tSubject\tTeacher\nJHS 1\tJunior High\tMathematics\t0244000000"}
          action={bulkImportClassesAndAllocations}
        />
      </TabsContent>

      <TabsContent value="teachers">
        <ImportPanel<TeacherImportRow>
          fields={TEACHER_FIELDS}
          helpText="Registers a login account for each teacher, same as the one-at-a-time Teachers form. Phone becomes their login password. Leave Email blank to get an auto-generated Teacher ID login instead."
          sampleRow={"First Name\tLast Name\tPhone\tEmail\tEmployee Number\tQualification\tSpecialization\nAma\tMensah\t0244000001\t\tEMP001\tB.Ed\tMathematics"}
          action={bulkImportTeachers}
        />
      </TabsContent>

      <TabsContent value="parents">
        <ImportPanel<ParentImportRow>
          fields={PARENT_FIELDS}
          helpText="Registers a login account for each parent. Phone becomes their login password, and it's also how the Students sheet auto-links a child to a parent below."
          sampleRow={"First Name\tLast Name\tPhone\tEmail\tOccupation\tAddress\nKwame\tOsei\t0244000002\t\tTrader\tAccra"}
          action={bulkImportParents}
        />
      </TabsContent>

      <TabsContent value="students">
        <ImportPanel<StudentImportRow>
          fields={STUDENT_FIELDS}
          helpText="Registers each student and auto-enrolls them into Class (created automatically if given a Level and it doesn't exist yet). Parent Phone auto-links them to an already-registered parent with that phone number. Enrollment Source is In Person or Social Media (defaults to In Person)."
          sampleRow={
            "First Name\tMiddle Name\tLast Name\tDate of Birth\tGender\tClass\tLevel\tEnrollment Source\tParent Phone\nAkosua\t\tBoateng\t2012-05-14\tFemale\tJHS 1\tJunior High\tIn Person\t0244000002"
          }
          action={bulkImportStudents}
        />
      </TabsContent>

      <TabsContent value="fees">
        <ImportPanel<FeeImportRow>
          fields={FEE_FIELDS}
          helpText="Creates fee structures (pricing rules) using your current academic year. Leave Subject blank for a whole-class materials fee. Class and Subject must already exist — use the Classes & Allocation tab first. Leave Term blank to use the current term. This only sets prices — use the existing Generate Charges button on the Fees page to bill enrolled students, and the Payments tab below (or the Fees page) to record money received."
          sampleRow={"Class\tSubject\tTerm\tAmount\tDescription\nJHS 1\tMathematics\tTerm 1\t200\t\nJHS 1\t\tTerm 1\t50\tTextbook fee"}
          action={bulkImportFees}
        />
      </TabsContent>

      <TabsContent value="timetable">
        <ImportPanel<TimetableImportRow>
          fields={TIMETABLE_FIELDS}
          helpText="Creates one recurring weekly slot per row, rostered to every student currently enrolled in that class/subject. Class and Subject must already exist and be linked (Classes & Allocation tab). Leave Teacher blank to use whoever is already assigned to that class/subject. Type is Center, Home Service, or Online (defaults to Center). To limit a slot to a subset of students, adjust it afterward on the Timetable page."
          sampleRow={
            "Class\tSubject\tTeacher\tDay\tStart Time\tEnd Time\tType\tLocation\nJHS 1\tMathematics\t0244000000\tMonday\t14:00\t15:00\tCenter\tMain Hall"
          }
          action={bulkImportTimetable}
        />
      </TabsContent>

      <TabsContent value="payments">
        <ImportPanel<PaymentImportRow>
          fields={PAYMENT_FIELDS}
          helpText="Records money already received and auto-allocates it against that student's oldest outstanding charges first. Student ID is the Student ID shown on their profile (e.g. ZIVA-2026-0001). Method is Cash or Mobile Money."
          sampleRow={"Student ID\tAmount\tMethod\tReference\tNotes\nZIVA-2026-0001\t150\tCash\t\t"}
          action={bulkImportPayments}
        />
      </TabsContent>
    </Tabs>
  );
}
