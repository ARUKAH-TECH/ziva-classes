"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentAvatar } from "@/components/domain/student-avatar";
import { requestPhotoChange } from "@/lib/actions/change-requests";

const ACCEPTED = "image/jpeg,image/jpg,image/png,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

export function ChildPhotoPanel({
  studentId,
  photoUrl,
  canRequestChange,
}: {
  studentId: string;
  photoUrl: string | null;
  canRequestChange: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ACCEPTED.split(",").includes(file.type)) {
      setError("Only JPG, PNG, and WebP images are supported.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setBusy(true);
    const formData = new FormData();
    formData.append("studentId", studentId);
    formData.append("file", file);
    const result = await requestPhotoChange(formData);
    setBusy(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Passport Photo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {sent && <Alert variant="success">Your new photo has been submitted for admin review.</Alert>}

        <div className="flex items-center gap-5">
          <StudentAvatar url={photoUrl} name="Student" size={100} />
          {canRequestChange ? (
            <div className="space-y-2">
              <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={onFileChange} />
              <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
                <Upload className="h-4 w-4" /> {busy ? "Submitting..." : "Request photo change"}
              </Button>
              <p className="text-xs text-ink-500">JPG, PNG, or WebP. Max 5MB. Reviewed by the school before it replaces the official photo.</p>
            </div>
          ) : (
            <p className="text-xs text-ink-500">
              Photo changes by parents aren&apos;t enabled — contact the school office to update this.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
