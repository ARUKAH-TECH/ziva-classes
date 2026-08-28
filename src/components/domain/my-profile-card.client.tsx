"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { updateMyPhone } from "@/lib/actions/profile";

const schema = z.object({ phone: z.string().optional() });
type FormValues = z.infer<typeof schema>;

// Shared by every role's own Profile page. Name/email/role-specific fields
// (qualification, occupation, ...) are read-only here — RLS only grants a
// teacher/parent an UPDATE policy on their own `users` row, not on
// teacher_profiles/parent_profiles, so phone is genuinely the only field
// they can save. See requireOrgMember/updateMyPhone comments.
export function MyProfileCard({
  firstName,
  lastName,
  email,
  phone,
  fields,
  revalidatePathAfter,
}: {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  fields: { label: string; value: string }[];
  revalidatePathAfter: string;
}) {
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { phone: phone ?? "" } });

  async function onSubmit(values: FormValues) {
    setStatus(null);
    setSubmitting(true);
    const result = await updateMyPhone(values.phone ?? "", revalidatePathAfter);
    setSubmitting(false);
    setStatus(
      result.success
        ? { type: "success", message: "Phone number updated." }
        : { type: "error", message: result.error }
    );
  }

  return (
    <Card>
      <CardContent>
        {status && (
          <Alert variant={status.type} className="mb-4">
            {status.message}
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Name</p>
            <p className="mt-0.5 text-sm text-navy-900">
              {firstName} {lastName}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Email</p>
            <p className="mt-0.5 text-sm text-navy-900">{email ?? "—"}</p>
          </div>
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{f.label}</p>
              <p className="mt-0.5 text-sm text-navy-900">{f.value}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 max-w-xs">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} aria-invalid={!!errors.phone} />
          <Button type="submit" disabled={submitting} className="mt-3">
            {submitting ? "Saving..." : "Save phone number"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
