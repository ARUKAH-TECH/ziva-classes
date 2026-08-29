"use client";

import { useState } from "react";
import { KeyRound, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";
import { resetUserPassword } from "@/lib/actions/user-admin";

// Shared by the Teacher/Parent/Student detail and list views. `userId` is
// the auth users.id (not the profile row id) — the id resetUserPassword
// expects.
export function ResetPasswordButton({
  userId,
  size = "sm",
}: {
  userId: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  async function doReset() {
    setError(null);
    setBusy(true);
    const result = await resetUserPassword(userId);
    setBusy(false);
    if (result.success) {
      setNewPassword(result.data.tempPassword);
    } else {
      setError(result.error);
    }
  }

  function close() {
    setOpen(false);
    setNewPassword(null);
    setError(null);
  }

  return (
    <>
      <Button variant="ghost" size={size} onClick={() => setOpen(true)}>
        <KeyRound className="h-4 w-4" /> Reset password
      </Button>

      <Dialog open={open} onClose={close} title="Reset password">
        {newPassword ? (
          <div className="space-y-4">
            <Alert variant="success">
              Password reset to their phone number on file (or a temporary one if none is on file).
              Share it securely.
            </Alert>
            <div className="rounded border border-gray-300 bg-surface p-3 font-mono text-sm">
              <p className="flex items-center gap-2">
                New password: {newPassword}
                <button
                  onClick={() => navigator.clipboard.writeText(newPassword)}
                  className="rounded p-1 text-ink-500 hover:bg-gray-100"
                  aria-label="Copy password"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </p>
            </div>
            <Button onClick={close} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">
              This immediately resets their password to the phone number on file for this account
              (or a temporary one if none is on file). Their current password stops working right
              away.
            </p>
            {error && <Alert variant="error">{error}</Alert>}
            <div className="flex gap-2">
              <Button onClick={doReset} disabled={busy}>
                {busy ? "Resetting..." : "Reset password"}
              </Button>
              <Button variant="ghost" onClick={close} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
