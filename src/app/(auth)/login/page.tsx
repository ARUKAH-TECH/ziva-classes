"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ROLE_HOME_PATH, type UserRole } from "@/lib/permissions/roles";
import { ZivaLogo } from "@/components/domain/ziva-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { ForgotPasswordDialog } from "./forgot-password-dialog.client";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginForm) {
    setServerError(null);
    setSubmitting(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword(values);

    if (error || !data.user) {
      setSubmitting(false);
      setServerError("Incorrect email or password. Please try again.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();

    setSubmitting(false);

    if (profileError || !profile) {
      setServerError(
        "Signed in, but no profile was found for this account. Contact an administrator."
      );
      return;
    }

    const role = (profile as { role: UserRole }).role;
    router.push(ROLE_HOME_PATH[role]);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <ZivaLogo size={72} />
          <h1 className="mt-4 text-2xl">ZIVA Online & Special Classes</h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-wide text-gold-700">
            Excellence Our Hallmark
          </p>
        </div>

        <div className="rounded-card border border-gray-300 bg-white p-6 shadow-card">
          <h2 className="mb-1 text-lg font-semibold text-navy-900">Sign in</h2>
          <p className="mb-5 text-sm text-ink-500">
            Enter your credentials to access your portal.
          </p>

          {serverError && (
            <Alert variant="error" className="mb-4">
              {serverError}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-error">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                {...register("password")}
              />
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-error">
                  {errors.password.message}
                </p>
              )}
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="mt-1.5 text-sm text-royal-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-royal-600 hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-ink-500">
          ZIVA Online &amp; Special Classes &middot; EST. 2023
        </p>
      </div>

      <ForgotPasswordDialog open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </main>
  );
}
