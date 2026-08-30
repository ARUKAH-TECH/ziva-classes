"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ROLE_HOME_PATH, type UserRole } from "@/lib/permissions/roles";
import { resolveLoginEmailById, resolvePasswordlessLoginById } from "@/lib/actions/auth-lookup";
import { ZivaLogo } from "@/components/domain/ziva-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ForgotPasswordDialog } from "./forgot-password-dialog.client";

const emailLoginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type EmailLoginForm = z.infer<typeof emailLoginSchema>;

const idLoginSchema = z.object({
  loginId: z.string().min(1, "ID is required"),
  password: z.string().optional(),
});
type IdLoginForm = z.infer<typeof idLoginSchema>;

// Student IDs (ZIVA-...) and Parent IDs (PAR-...) sign in with just the ID —
// no password field shown. Teacher IDs (TCH-...) and anything unrecognized
// still require a password.
function isPasswordlessLoginId(loginId: string) {
  const upper = loginId.trim().toUpperCase();
  return upper.startsWith("ZIVA-") || upper.startsWith("PAR-");
}

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const emailForm = useForm<EmailLoginForm>({ resolver: zodResolver(emailLoginSchema) });
  const idForm = useForm<IdLoginForm>({ resolver: zodResolver(idLoginSchema) });
  const idLoginIdValue = idForm.watch("loginId");

  async function completeSignIn(email: string, password: string, genericErrorMessage: string) {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setSubmitting(false);
      setServerError(genericErrorMessage);
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

  async function onEmailSubmit(values: EmailLoginForm) {
    setServerError(null);
    setSubmitting(true);
    await completeSignIn(values.email, values.password, "Incorrect email or password. Please try again.");
  }

  async function onIdSubmit(values: IdLoginForm) {
    setServerError(null);

    const trimmedId = values.loginId.trim();

    if (isPasswordlessLoginId(trimmedId)) {
      setSubmitting(true);
      const credentials = await resolvePasswordlessLoginById(trimmedId);
      if (!credentials) {
        setSubmitting(false);
        setServerError("ID not found. Please check and try again.");
        return;
      }
      await completeSignIn(credentials.email, credentials.password, "ID not found. Please check and try again.");
      return;
    }

    if (!values.password) {
      idForm.setError("password", { message: "Password is required" });
      return;
    }

    setSubmitting(true);
    const email = await resolveLoginEmailById(trimmedId);
    if (!email) {
      setSubmitting(false);
      setServerError("Incorrect ID or password. Please try again.");
      return;
    }

    await completeSignIn(email, values.password, "Incorrect ID or password. Please try again.");
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

          <Tabs defaultValue="email">
            <TabsList className="mb-5">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="id">ID</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} noValidate className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={!!emailForm.formState.errors.email}
                    aria-describedby={emailForm.formState.errors.email ? "email-error" : undefined}
                    {...emailForm.register("email")}
                  />
                  {emailForm.formState.errors.email && (
                    <p id="email-error" className="mt-1 text-sm text-error">
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={!!emailForm.formState.errors.password}
                    aria-describedby={emailForm.formState.errors.password ? "password-error" : undefined}
                    {...emailForm.register("password")}
                  />
                  {emailForm.formState.errors.password && (
                    <p id="password-error" className="mt-1 text-sm text-error">
                      {emailForm.formState.errors.password.message}
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
            </TabsContent>

            <TabsContent value="id">
              <form onSubmit={idForm.handleSubmit(onIdSubmit)} noValidate className="space-y-4">
                <div>
                  <Label htmlFor="login-id">Student, Teacher, or Parent ID</Label>
                  <Input
                    id="login-id"
                    type="text"
                    autoComplete="username"
                    placeholder="ZIVA-2026-0001"
                    aria-invalid={!!idForm.formState.errors.loginId}
                    aria-describedby={idForm.formState.errors.loginId ? "login-id-error" : undefined}
                    {...idForm.register("loginId")}
                  />
                  {idForm.formState.errors.loginId && (
                    <p id="login-id-error" className="mt-1 text-sm text-error">
                      {idForm.formState.errors.loginId.message}
                    </p>
                  )}
                </div>

                {isPasswordlessLoginId(idLoginIdValue || "") ? (
                  <p className="text-sm text-ink-500">
                    Students and parents sign in with just their ID — no password needed.
                  </p>
                ) : (
                  <div>
                    <Label htmlFor="id-password">Password</Label>
                    <Input
                      id="id-password"
                      type="password"
                      autoComplete="current-password"
                      aria-invalid={!!idForm.formState.errors.password}
                      aria-describedby={idForm.formState.errors.password ? "id-password-error" : undefined}
                      {...idForm.register("password")}
                    />
                    {idForm.formState.errors.password && (
                      <p id="id-password-error" className="mt-1 text-sm text-error">
                        {idForm.formState.errors.password.message}
                      </p>
                    )}
                    <p className="mt-1.5 text-sm text-ink-500">
                      Lost your password? Ask your school admin to reset it.
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

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
