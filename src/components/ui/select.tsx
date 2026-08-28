import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "h-10 w-full appearance-none rounded border border-gray-300 bg-white px-3 pr-9 text-sm text-ink-900",
            "focus:border-royal-600 focus:outline-none focus:ring-1 focus:ring-royal-600",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
          aria-hidden="true"
        />
      </div>
    );
  }
);
Select.displayName = "Select";
