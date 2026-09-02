import Link from "next/link";
import { ZivaLogo } from "@/components/domain/ziva-logo";
import { AppFooter } from "@/components/domain/app-footer";
import { Button } from "@/components/ui/button";

// ZIVA accounts (Admin, Teacher, Parent, Student) are provisioned by
// administrators from the Admin > Users / Students / Teachers / Parents
// modules — there is no public self-registration for a school SCMS.
// This page exists so the route is reachable and explains that,
// rather than exposing an open sign-up form.
export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-1">
      <div className="w-full max-w-sm text-center">
        <div className="mb-1.5 flex flex-col items-center">
          <ZivaLogo size={34} />
          <h1 className="mt-0.5 text-base">ZIVA Online &amp; Special Classes</h1>
        </div>
        <div className="rounded-card border border-gray-300 bg-white p-3 shadow-card">
          <h2 className="mb-1 text-base font-semibold text-navy-900">
            Accounts are created by ZIVA staff
          </h2>
          <p className="mb-2 text-sm text-ink-500">
            Admin, teacher, parent, and student accounts are set up by a ZIVA
            administrator. If you&apos;re expecting access, contact the school
            office for your login details.
          </p>
          <Link href="/login">
            <Button className="w-full">Back to sign in</Button>
          </Link>
        </div>
        <AppFooter className="mt-1.5 py-0" />
      </div>
    </main>
  );
}
