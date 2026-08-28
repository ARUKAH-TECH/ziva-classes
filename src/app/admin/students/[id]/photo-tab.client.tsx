"use client";

import { useRef, useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentAvatar } from "@/components/domain/student-avatar";
import { uploadStudentPhoto, removeStudentPhoto } from "@/lib/actions/student-photo";
import { ChangeRequestBanner } from "@/components/domain/change-request-banner.client";
import type { ChangeRequestRow } from "@/lib/actions/change-requests";

const ACCEPTED = "image/jpeg,image/jpg,image/png,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

export function PhotoTab({
  studentId,
  photoUrl,
  hasPhoto,
  pendingRequests,
}: {
  studentId: string;
  photoUrl: string | null;
  hasPhoto: boolean;
  pendingRequests: (ChangeRequestRow & { preview_url?: string | null })[];
}) {
  const [preview, setPreview] = useState<string | null>(photoUrl);
  const [exists, setExists] = useState(hasPhoto);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick() {
    inputRef.current?.click();
  }

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
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    const formData = new FormData();
    formData.append("studentId", studentId);
    formData.append("file", file);

    const result = await uploadStudentPhoto(formData);
    setBusy(false);

    if (!result.success) {
      setError(result.error);
      setPreview(photoUrl);
      return;
    }
    setExists(true);
    // reload so the server resolves a fresh signed URL for the new path
    window.location.reload();
  }

  async function onRemove() {
    if (!confirm("Remove this student's photo?")) return;
    setBusy(true);
    const result = await removeStudentPhoto(studentId);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setPreview(null);
    setExists(false);
  }

  return (
    <>
      <ChangeRequestBanner requests={pendingRequests} />
      <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Passport photo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex items-center gap-5">
          <StudentAvatar url={preview} name="Student" size={100} />
          <div className="space-y-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={onFileChange}
            />
            <Button type="button" variant="secondary" size="sm" onClick={pick} disabled={busy}>
              <Upload className="h-4 w-4" /> {exists ? "Replace photo" : "Upload photo"}
            </Button>
            {exists && (
              <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={busy} className="ml-2">
                <Trash2 className="h-4 w-4 text-error" /> Remove
              </Button>
            )}
            <p className="text-xs text-ink-500">JPG, PNG, or WebP. Max 5MB — automatically resized and compressed.</p>
          </div>
        </div>
      </CardContent>
      </Card>
    </>
  );
}
