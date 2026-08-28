"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

const schema = z.object({ email: z.string().email("Enter a valid email address") });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function handleClose() {
    setStatus(null);
    reset();
    onClose();
  }

  async function onSubmit(values: FormValues) {
    setStatus(null);
    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setSubmitting(false);
    if (error) {
      setStatus({ type: "error", message: error.message });
      return;
    }
    // Don't reveal whether the email exists — same message either way.
    setStatus({
      type: "success",
      message: "If an account exists for that email, a password reset link has been sent.",
    });
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Reset your password">
      <p className="mb-4 text-sm text-ink-500">
        Enter the email on your ZIVA account and we&apos;ll send you a link to set a new password.
      </p>

      {status && (
        <Alert variant={status.type} className="mb-4">
          {status.message}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-sm text-error">{errors.email.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </Dialog>
  );
}
