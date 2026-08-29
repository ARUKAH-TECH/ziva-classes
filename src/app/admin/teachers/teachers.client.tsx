"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, GraduationCap, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ResetPasswordButton } from "@/components/domain/reset-password-button.client";
import { ViewPasswordButton } from "@/components/domain/view-password-button.client";
import { createTeacher, setTeacherActive, type TeacherRow } from "@/lib/actions/teachers";

export function TeachersClient({
  initialTeachers,
  canViewPassword,
}: {
  initialTeachers: TeacherRow[];
  canViewPassword: boolean;
}) {
  const [teachers, setTeachers] = useState(initialTeachers);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add teacher
          </Button>
        </div>

        {teachers.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No teachers yet"
            description="Add your first teacher account. They'll be able to sign in once you assign them to classes and subjects."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Employee #</TH>
                <TH>Specialization</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {teachers.map((t) => (
                <TR key={t.id}>
                  <TD className="font-medium text-navy-900">
                    <Link href={`/admin/teachers/${t.id}`} className="hover:text-royal-600 hover:underline">
                      {t.first_name} {t.last_name}
                    </Link>
                  </TD>
                  <TD>{t.email ?? (t.login_id ? <span className="font-mono text-xs">{t.login_id}</span> : "—")}</TD>
                  <TD>{t.employee_number ?? "—"}</TD>
                  <TD>{t.specialization ?? "—"}</TD>
                  <TD>
                    <Badge variant={t.is_active ? "success" : "neutral"}>
                      {t.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/teachers/${t.id}`}>
                        <Button variant="ghost" size="sm">
                          Manage
                        </Button>
                      </Link>
                      <ResetPasswordButton userId={t.user_id} />
                      {canViewPassword && <ViewPasswordButton userId={t.user_id} />}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const result = await setTeacherActive(t.user_id, !t.is_active);
                          if (result.success) {
                            setTeachers((prev) =>
                              prev.map((x) => (x.id === t.id ? { ...x, is_active: !t.is_active } : x))
                            );
                          } else {
                            alert(result.error);
                          }
                        }}
                      >
                        {t.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>

      <AddTeacherDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </Card>
  );
}

function AddTeacherDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [qualification, setQualification] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ email: string; tempPassword: string; loginId: string | null } | null>(
    null
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await createTeacher({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      employee_number: employeeNumber,
      qualification,
      specialization,
    });
    setBusy(false);
    if (result.success) {
      setCreated({ email, tempPassword: result.data.tempPassword, loginId: result.data.loginId });
    } else {
      setError(result.error);
    }
  }

  function finish() {
    window.location.reload();
  }

  if (created) {
    return (
      <Dialog open onClose={finish} title="Teacher account created">
        <div className="space-y-4">
          <Alert variant="success">
            {created.loginId
              ? `${firstName} ${lastName} can now sign in on the ID tab of the login page.`
              : `${created.email} can now sign in.`}{" "}
            Their password is their phone number — share these credentials securely.
          </Alert>
          <div className="rounded border border-gray-300 bg-surface p-3 font-mono text-sm">
            {created.loginId ? (
              <p>Login ID: {created.loginId}</p>
            ) : (
              <p>Email: {created.email}</p>
            )}
            <p className="flex items-center gap-2">
              Password: {created.tempPassword}
              <button
                onClick={() => navigator.clipboard.writeText(created.tempPassword)}
                className="rounded p-1 text-ink-500 hover:bg-gray-100"
                aria-label="Copy password"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </p>
          </div>
          <Button onClick={finish} className="w-full">
            Done
          </Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add teacher">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="t-first">First name</Label>
            <Input id="t-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="t-last">Last name</Label>
            <Input id="t-last" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>
        <div>
          <Label htmlFor="t-email">Email (optional)</Label>
          <Input id="t-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <p className="mt-1 text-xs text-ink-500">
            Leave blank to generate a Teacher ID they can sign in with instead of an email.
          </p>
        </div>
        <div>
          <Label htmlFor="t-phone">Phone</Label>
          <Input id="t-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={6} />
          <p className="mt-1 text-xs text-ink-500">This becomes the teacher&apos;s login password.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="t-employee">Employee number</Label>
            <Input
              id="t-employee"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="t-specialization">Specialization</Label>
            <Input
              id="t-specialization"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="Mathematics"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="t-qualification">Qualification</Label>
          <Input id="t-qualification" value={qualification} onChange={(e) => setQualification(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Creating account..." : "Create teacher account"}
        </Button>
      </form>
    </Dialog>
  );
}
