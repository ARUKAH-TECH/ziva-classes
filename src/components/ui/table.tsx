import * as React from "react";
import { cn } from "@/lib/utils";

// Simple styled table primitives. Lists in Phase 2 (academic years, terms,
// levels, classes, subjects, teachers) are small — TanStack Table (sorting,
// pagination, virtualization) is deferred until a module actually needs it
// (e.g. Students, which will have hundreds of rows).

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-card border border-gray-300">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-gray-100", className)} {...props} />;
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-gray-300 bg-white", className)} {...props} />;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-surface", className)} {...props} />;
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-500",
        className
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 text-ink-900", className)} {...props} />;
}
