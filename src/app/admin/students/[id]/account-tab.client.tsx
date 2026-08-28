"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { provisionStudentAccount } from "@/lib/actions/students";

export function AccountTab({
  studentId,
  hasAccount,
  accountEmail,
  suggestedEmail,
}: {
  studentId: string;
  hasAccount: boolean;
  accountEmail: string | null;
  suggestedEmail: string | null;
}) {
  const [email, setEmail] = useState(suggestedEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await provisionStudentAccount(studentId, email);
    setBusy(false);
    if (result.success) {
      setCreated({ email, tempPassword: result.data.tempPassword });
    } else {
      setError(result.error);
    }
  }

  // Checked before hasAccount: provisioning revalidates the page, so the
  // server-fetched hasAccount=true prop and this local `created` state both
  // land in the same render — without this ordering, the one-time
  // temp-password reveal would never be seen, only the "Active" state.
  if (created) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account created</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="success" className="mb-4">
            {created.email} can now sign in. Share these temporary credentials securely — they should
            change their password after first login.
          </Alert>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium text-navy-900">Email:</span> {created.email}
            </p>
            <p>
              <span className="font-medium text-navy-900">Password:</span> {created.tempPassword}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="success">Active</Badge>
            <span className="text-sm text-navy-900">{accountEmail}</span>
          </div>
          <p className="mt-2 text-sm text-ink-500">
            This student can sign in to the Student Portal with this email.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-ink-500">
          This student doesn&apos;t have a Student Portal login yet. Create one to let them sign in and
          see their own subjects, timetable, attendance, results, and assignments.
        </p>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}
        <form onSubmit={onSubmit} className="max-w-sm space-y-4">
          <div>
            <Label htmlFor="account-email">Email</Label>
            <Input
              id="account-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={busy}>
            <KeyRound className="h-4 w-4" />
            {busy ? "Creating..." : "Create login"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
