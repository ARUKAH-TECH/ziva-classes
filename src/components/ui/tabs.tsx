"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
}
const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  defaultValue,
  children,
  className,
}: {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [value, setValue] = React.useState(defaultValue);

  // Lets a link elsewhere in the app deep-link straight to a specific tab
  // (e.g. /admin/settings#academic) instead of just landing on the default
  // and making the reader hunt for the right one themselves. Checked only
  // once after mount so server and client render the same initial content
  // (no hydration mismatch).
  React.useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) setValue(hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn("flex gap-1 border-b border-gray-300", className)}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used inside Tabs");
  const active = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-royal-600 text-royal-600"
          : "border-transparent text-ink-500 hover:text-navy-900"
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used inside Tabs");
  if (ctx.value !== value) return null;
  return <div className="pt-5">{children}</div>;
}
