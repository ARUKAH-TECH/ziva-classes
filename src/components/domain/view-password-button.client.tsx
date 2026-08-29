"use client";

import { useState } from "react";
import { Eye, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";
import { getCurrentPassword } from "@/lib/actions/user-admin";

// Only rendered when the caller is confirmed Super Admin (see isSuperAdmin
// in user-admin.ts) — getCurrentPassword enforces the same check itself,
// this is just to avoid showing the button to an admin who'd get an error.
export function ViewPasswordButton({
  userId,
  size = "sm",
}: {
  userId: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setError(null);
    setBusy(true);
    const result = await getCurrentPassword(userId);
    setBusy(false);
    setLoaded(true);
    if (result.success) {
      setPassword(result.data.password);
    } else {
      setError(result.error);
    }
  }

  function openDialog() {
    setOpen(true);
    setLoaded(false);
    load();
  }

  return (
    <>
      <Button variant="ghost" size={size} onClick={openDialog}>
        <Eye className="h-4 w-4" /> View password
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Current password">
        {busy && <p className="text-sm text-ink-500">Loading...</p>}
        {error && <Alert variant="error">{error}</Alert>}
        {loaded && !error && (
          password ? (
            <div className="rounded border border-gray-300 bg-surface p-3 font-mono text-sm">
              <p className="flex items-center gap-2">
                Password: {password}
                <button
                  onClick={() => navigator.clipboard.writeText(password)}
                  className="rounded p-1 text-ink-500 hover:bg-gray-100"
                  aria-label="Copy password"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-500">
              No password on record for this account — it may predate this feature. Use Reset
              password to set one you&apos;ll be able to view here going forward.
            </p>
          )
        )}
      </Dialog>
    </>
  );
}
