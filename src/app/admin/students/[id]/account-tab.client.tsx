"use client";

import { useState } from "react";
import { KeyRound, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResetPasswordButton } from "@/components/domain/reset-password-button.client";
import { ViewPasswordButton } from "@/components/domain/view-password-button.client";
import { provisionStudentAccount } from "@/lib/actions/students";

// Mirrors isJhsOrShsLevel in lib/actions/students.ts — a student's own
// login is only offered for JHS/SHS; Primary students' portal access is
// exclusively through their parent's account.
function isJhsOrShsLevel(levelName: string | null): boolean {
  return /^\s*(JHS|SHS)\b/i.test(levelName ?? "");
}

export function AccountTab({
  studentId,
  studentNumber,
  hasAccount,
  accountUserId,
  academicLevelName,
  canViewPassword,
}: {
  studentId: string;
  studentNumber: string;
  hasAccount: boolean;
  accountUserId: string | null;
  academicLevelName: string | null;
  canViewPassword: boolean;
}) {
  const eligible = isJhsOrShsLevel(academicLevelName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ tempPassword: string } | null>(null);

  async function onCreate() {
    setError(null);
    setBusy(true);
    const result = await provisionStudentAccount(studentId);
    setBusy(false);
    if (result.success) {
      setCreated({ tempPassword: result.data.tempPassword });
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
            {studentNumber} can now sign in on the ID tab of the login page. Their password is a
            linked parent&apos;s phone number (or a temporary one if no parent is linked yet) —
            share these credentials securely.
          </Alert>
          <div className="rounded border border-gray-300 bg-surface p-3 font-mono text-sm">
            <p>Student ID: {studentNumber}</p>
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
        </CardContent>
      </Card>
    );
  }

  if (hasAccount) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Account</CardTitle>
          <div className="flex items-center gap-2">
            {accountUserId && <ResetPasswordButton userId={accountUserId} />}
            {accountUserId && canViewPassword && <ViewPasswordButton userId={accountUserId} />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="success">Active</Badge>
            <span className="font-mono text-sm text-navy-900">{studentNumber}</span>
          </div>
          <p className="mt-2 text-sm text-ink-500">
            This student signs in to the Student Portal with this Student ID and their password —
            no email required. Their parent can also see this same information from their own
            account.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!eligible) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink-500">
            A student login of their own is only available for JHS and SHS students — their
            parent&apos;s account is the primary way to view their portal (attendance, results,
            fees, and more).{" "}
            {academicLevelName
              ? "This student isn't in a JHS or SHS class."
              : "This student isn't enrolled in a class yet."}{" "}
            Once they&apos;re enrolled in a JHS or SHS class, you can optionally create a login for
            them here.
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
          This student doesn&apos;t have a Student Portal login yet. Their parent can already view
          their portal from their own account — creating a login here is optional, for JHS/SHS
          students who&apos;d like to sign in with their own Student ID (
          <span className="font-mono">{studentNumber}</span>) as well.
        </p>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}
        <Button onClick={onCreate} disabled={busy}>
          <KeyRound className="h-4 w-4" />
          {busy ? "Creating..." : "Create login"}
        </Button>
      </CardContent>
    </Card>
  );
}
