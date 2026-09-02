"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { AppFooter } from "@/components/domain/app-footer";
import type { UserRole } from "@/lib/permissions/roles";

export function DashboardShell({
  role,
  orgName,
  userLabel,
  roleLabel,
  children,
}: {
  role: UserRole;
  orgName: string;
  userLabel: string;
  roleLabel: string;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <MobileNav role={role} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          orgName={orgName}
          userLabel={userLabel}
          roleLabel={roleLabel}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        <AppFooter />
      </div>
    </div>
  );
}
