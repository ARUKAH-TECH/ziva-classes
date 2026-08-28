"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { ZivaLogo } from "@/components/domain/ziva-logo";
import { NAV_ITEMS } from "@/lib/permissions/nav";
import type { UserRole } from "@/lib/permissions/roles";
import { cn } from "@/lib/utils";

export function MobileNav({
  role,
  open,
  onClose,
}: {
  role: UserRole;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        aria-label="Close navigation"
        className="absolute inset-0 bg-navy-900/60"
        onClick={onClose}
      />
      <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-navy-900 text-white">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <ZivaLogo size={32} />
            <p className="font-heading text-sm font-semibold">ZIVA</p>
          </div>
          <button
            aria-label="Close navigation"
            onClick={onClose}
            className="rounded p-1 text-white/80 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium",
                  active ? "bg-royal-600 text-white" : "text-white/80 hover:bg-white/10"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
