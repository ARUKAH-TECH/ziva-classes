"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { ZivaLogo } from "@/components/domain/ziva-logo";
import { AppFooter } from "@/components/domain/app-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // The recovery link lands here as #access_token=...&refresh_token=...&
  // type=recovery (GoTrue's /verify endpoint, hash-fragment style — never
  // sent to the server, so this has to run client-side). createBrowserClient's
  // automatic detectSessionInUrl handling wasn't reliably picking this hash
  // up in practice, so this parses it explicitly and calls setSession()
  // itself rather than trusting it to happen implicitly.
  useEffect(() => {
    const supabase = createClient();

    async function establishSession() {
      const hash = window.location.hash;
      if (hash.length > 1) {
        const params = new URLSearchParams(hash.slice(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          // Strip the tokens out of the URL now that they're consumed.
          window.history.replaceState(null, "", window.location.pathname);
          if (!error) {
            setReady(true);
            setChecking(false);
            return;
          }
        }
      }

      // Fallback: a session already exists (e.g. page reload after the
      // hash was already consumed).
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setReady(!!session);
      setChecking(false);
    }

    establishSession();
  }, []);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ password: values.password });

    setSubmitting(false);
    if (error) {
      setServerError(error.message);
      return;
    }

    // Sign out the recovery session first — otherwise middleware treats
    // /login as "already signed in" and bounces straight to the role home
    // instead of showing the sign-in form the user is expected to use with
    // their new password.
    await supabase.auth.signOut();

    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-1">
      <div className="w-full max-w-sm">
        <div className="mb-1.5 flex flex-col items-center text-center">
          <ZivaLogo size={34} />
          <h1 className="mt-0.5 text-base">ZIVA Online &amp; Special Classes</h1>
        </div>

        <div className="rounded-card border border-gray-300 bg-white p-3 shadow-card">
          <h2 className="mb-0.5 text-base font-semibold text-navy-900">Set a new password</h2>

          {done ? (
            <Alert variant="success" className="mt-2">
              Password updated. Redirecting you to sign in...
            </Alert>
          ) : checking ? (
            <p className="mt-2 text-sm text-ink-500">Verifying your reset link...</p>
          ) : !ready ? (
            <Alert variant="error" className="mt-2">
              This reset link is invalid or has expired. Request a new one from the sign-in page.
            </Alert>
          ) : (
            <>
              <p className="mb-2 text-sm text-ink-500">Choose a new password for your account.</p>
              {serverError && (
                <Alert variant="error" className="mb-2">
                  {serverError}
                </Alert>
              )}
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-1.5">
                <div>
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={!!errors.password}
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-error">{errors.password.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={!!errors.confirmPassword}
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-error">{errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Updating..." : "Update password"}
                </Button>
              </form>
            </>
          )}
        </div>
        <AppFooter className="mt-1.5 py-0" />
      </div>
    </main>
  );
}
