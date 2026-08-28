"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ZivaLogo } from "@/components/domain/ziva-logo";
import { NAV_ITEMS } from "@/lib/permissions/nav";
import type { UserRole } from "@/lib/permissions/roles";
import { cn } from "@/lib/utils";

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-navy-900 text-white lg:flex print:hidden">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <ZivaLogo size={36} />
        <div className="leading-tight">
          <p className="font-heading text-sm font-semibold">ZIVA</p>
          <p className="text-[11px] uppercase tracking-wide text-gold-500">
            Special Classes
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-royal-600 text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
