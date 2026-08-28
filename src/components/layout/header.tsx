"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, Menu, Search, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function Header({
  orgName,
  userLabel,
  roleLabel,
  onMenuClick,
}: {
  orgName: string;
  userLabel: string;
  roleLabel: string;
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-300 bg-white px-4 print:hidden lg:px-6">
      <div className="flex items-center gap-3">
        <button
          aria-label="Open navigation"
          onClick={onMenuClick}
          className="rounded p-2 text-navy-900 hover:bg-gray-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="hidden font-heading text-sm font-semibold text-navy-900 sm:block">
          {orgName}
        </span>
      </div>

      <div className="hidden max-w-sm flex-1 items-center gap-2 rounded border border-gray-300 bg-surface px-3 py-2 sm:mx-6 sm:flex">
        <Search className="h-4 w-4 text-ink-500" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search..."
          aria-label="Search"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="relative rounded p-2 text-navy-900 hover:bg-gray-100"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            className="flex items-center gap-2 rounded p-1.5 hover:bg-gray-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-royal-600 text-white">
              <User className="h-4 w-4" />
            </span>
            <span className="hidden text-left text-sm sm:block">
              <span className="block font-medium text-navy-900">{userLabel}</span>
              <span className="block text-xs text-ink-500">{roleLabel}</span>
            </span>
          </button>

          <div
            role="menu"
            className={cn(
              "absolute right-0 top-full mt-2 w-44 rounded border border-gray-300 bg-white py-1 shadow-card",
              profileOpen ? "block" : "hidden"
            )}
          >
            <button
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-navy-900 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
