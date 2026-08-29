"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";
import { deleteStudent } from "@/lib/actions/students";

export function DeleteStudentButton({ studentId, fullName }: { studentId: string; fullName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setError(null);
    setDeleting(true);
    const result = await deleteStudent(studentId);
    setDeleting(false);
    if (result.success) {
      router.push("/admin/students");
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
        <Trash2 className="h-4 w-4" /> Delete student
      </Button>

      <Dialog open={open} onClose={() => (!deleting ? setOpen(false) : undefined)} title="Delete student">
        <p className="mb-4 text-sm text-ink-500">
          This permanently deletes <strong>{fullName}</strong>&apos;s profile, login (if any), attendance,
          scores, fees, and terminal reports. This cannot be undone. Type their full name below to confirm.
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
