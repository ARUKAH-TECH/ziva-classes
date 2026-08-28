import Link from "next/link";
import { ZivaLogo } from "@/components/domain/ziva-logo";
import { Button } from "@/components/ui/button";

// ZIVA accounts (Admin, Teacher, Parent, Student) are provisioned by
// administrators from the Admin > Users / Students / Teachers / Parents
// modules — there is no public self-registration for a school SCMS.
// This page exists so the route is reachable and explains that,
// rather than exposing an open sign-up form.
export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex flex-col items-center">
          <ZivaLogo size={64} />
          <h1 className="mt-4 text-2xl">ZIVA Online &amp; Special Classes</h1>
        </div>
        <div className="rounded-card border border-gray-300 bg-white p-6 shadow-card">
          <h2 className="mb-2 text-lg font-semibold text-navy-900">
            Accounts are created by ZIVA staff
          </h2>
          <p className="mb-5 text-sm text-ink-500">
            Admin, teacher, parent, and student accounts are set up by a ZIVA
            administrator. If you&apos;re expecting access, contact the school
            office for your login details.
          </p>
          <Link href="/login">
            <Button className="w-full">Back to sign in</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
