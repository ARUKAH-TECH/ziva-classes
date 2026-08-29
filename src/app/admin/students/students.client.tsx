"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Users, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { StudentAvatar } from "@/components/domain/student-avatar";
import { ResetPasswordButton } from "@/components/domain/reset-password-button.client";
import { ViewPasswordButton } from "@/components/domain/view-password-button.client";
import { createStudent, type StudentListRow } from "@/lib/actions/students";
import type { ClassRow } from "@/lib/actions/classes";
import type { AcademicYear } from "@/lib/actions/academic-years";

type StudentWithPhoto = StudentListRow & { photo_url: string | null };

export function StudentsClient({
  initialStudents,
  classes,
  currentYear,
  canViewPassword,
}: {
  initialStudents: StudentWithPhoto[];
  classes: ClassRow[];
  currentYear: AcademicYear | null;
  canViewPassword: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add student
          </Button>
        </div>

        {initialStudents.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students yet"
            description="Add your first student to get started with enrollment, attendance, and reports."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH></TH>
                <TH>Student #</TH>
                <TH>Name</TH>
                <TH>Level / Class</TH>
                <TH>Parent/Guardian</TH>
                <TH>Location</TH>
                <TH>Source</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {initialStudents.map((s) => (
                <TR key={s.id}>
                  <TD>
                    <StudentAvatar url={s.photo_url} name={`${s.first_name} ${s.last_name}`} size={32} />
                  </TD>
                  <TD className="font-mono text-xs">{s.student_number}</TD>
                  <TD className="font-medium text-navy-900">
                    <Link href={`/admin/students/${s.id}`} className="hover:text-royal-600 hover:underline">
                      {s.first_name} {s.last_name}
                    </Link>
                  </TD>
                  <TD>
                    {s.class_name ? (
                      <>
                        {s.class_name}
                        <span className="block text-xs text-ink-500">{s.academic_level_name}</span>
                      </>
                    ) : (
                      <span className="text-ink-500">Not enrolled</span>
                    )}
                  </TD>
                  <TD>{s.parent_names}</TD>
                  <TD>{s.current_location ?? "—"}</TD>
                  <TD>
                    <Badge variant="neutral">
                      {s.enrollment_source === "SOCIAL_MEDIA" ? "Social Media" : "In-Person"}
                    </Badge>
                  </TD>
                  <TD>
                    <Badge variant={s.status === "ACTIVE" ? "success" : "neutral"}>{s.status}</Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/students/${s.id}`}>
                        <Button variant="ghost" size="sm">
                          Manage
                        </Button>
                      </Link>
                      {s.optional_user_id && <ResetPasswordButton userId={s.optional_user_id} />}
                      {s.optional_user_id && canViewPassword && (
                        <ViewPasswordButton userId={s.optional_user_id} />
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>

      <AddStudentDialog open={addOpen} onClose={() => setAddOpen(false)} classes={classes} currentYear={currentYear} />
    </Card>
  );
}

function AddStudentDialog({
  open,
  onClose,
  classes,
  currentYear,
}: {
  open: boolean;
  onClose: () => void;
  classes: ClassRow[];
  currentYear: AcademicYear | null;
}) {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<"IN_PERSON" | "SOCIAL_MEDIA">("IN_PERSON");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{
    studentId: string;
    studentNumber: string;
    tempPassword: string | null;
  } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await createStudent({
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      date_of_birth: dob,
      gender,
      phone,
      email,
      enrollment_source: source,
      class_id: classId,
      academic_year_id: currentYear?.id ?? "",
    });
    setBusy(false);
    if (result.success) {
      setCreated(result.data);
    } else {
      setError(result.error);
    }
  }

  function finish() {
    if (created) window.location.href = `/admin/students/${created.studentId}`;
  }

  if (created) {
    const tempPassword = created.tempPassword;
    return (
      <Dialog open onClose={finish} title="Student created">
        <div className="space-y-4">
          {tempPassword ? (
            <>
              <Alert variant="success">
                {firstName} {lastName} can now sign in on the ID tab of the login page. Share these
                credentials securely. Once a parent is linked, this password automatically updates
                to the parent&apos;s phone number.
              </Alert>
              <div className="rounded border border-gray-300 bg-surface p-3 font-mono text-sm">
                <p>Student ID: {created.studentNumber}</p>
                <p className="flex items-center gap-2">
                  Password: {tempPassword}
                  <button
                    onClick={() => navigator.clipboard.writeText(tempPassword)}
                    className="rounded p-1 text-ink-500 hover:bg-gray-100"
                    aria-label="Copy password"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </p>
              </div>
            </>
          ) : (
            <Alert variant="success">
              {firstName} {lastName}&apos;s Student ID is {created.studentNumber}. Their parent can
              already view their portal from the parent account. A student login of their own is only
              available for JHS and SHS students — you can create one from their profile page once
              they&apos;re enrolled in a JHS or SHS class, if you&apos;d like them to use it.
            </Alert>
          )}
          <Button onClick={finish} className="w-full">
            Done
          </Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add student" className="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {!currentYear && (
          <Alert variant="warning">
            No current academic year is set — set one in Settings so this student can be enrolled in a class now
            (you can still create the profile and enroll them later).
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="s-first">First name</Label>
            <Input id="s-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="s-middle">Middle name</Label>
            <Input id="s-middle" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="s-last">Last name</Label>
            <Input id="s-last" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="s-dob">Date of birth</Label>
            <Input id="s-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="s-gender">Gender</Label>
            <Select id="s-gender" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">—</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="s-phone">Phone (optional)</Label>
            <Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="s-email">Email (optional)</Label>
            <Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div>
          <Label htmlFor="s-source">Enrollment source</Label>
          <Select id="s-source" value={source} onChange={(e) => setSource(e.target.value as "IN_PERSON" | "SOCIAL_MEDIA")}>
            <option value="IN_PERSON">In-Person</option>
            <option value="SOCIAL_MEDIA">Social Media</option>
          </Select>
        </div>

        {classes.length > 0 && currentYear && (
          <div>
            <Label htmlFor="s-class">Enroll into class ({currentYear.name})</Label>
            <Select id="s-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Don&apos;t enroll yet</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.academic_level_name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Creating..." : "Add student"}
        </Button>
      </form>
    </Dialog>
  );
}
