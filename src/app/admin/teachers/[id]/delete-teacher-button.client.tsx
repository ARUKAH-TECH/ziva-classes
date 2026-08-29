"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";
import { deleteTeacher } from "@/lib/actions/teachers";

export function DeleteTeacherButton({ userId, fullName }: { userId: string; fullName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setError(null);
    setDeleting(true);
    const result = await deleteTeacher(userId);
    setDeleting(false);
    if (result.success) {
      router.push("/admin/teachers");
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="border border-error/30 text-error hover:bg-error/10"
        onClick={() => {
          setConfirmText("");
          setError(null);
          setOpen(true);
        }}
      >
        <Trash2 className="h-4 w-4" /> Delete teacher
      </Button>
      <Dialog open={open} onClose={() => (!deleting ? setOpen(false) : undefined)} title="Delete teacher">
        <p className="mb-4 text-sm text-ink-500">
          This permanently deletes <strong>{fullName}</strong>&apos;s account, login, and class/subject
          assignments. This cannot be undone. Type their full name below to confirm.
        </p>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={fullName}
          className="mb-4"
        />
        <div className="flex gap-2">
          <Button
            variant="danger"
            disabled={confirmText !== fullName || deleting}
            onClick={confirmDelete}
          >
            {deleting ? "Deleting..." : "Permanently delete"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </>
  );
}
