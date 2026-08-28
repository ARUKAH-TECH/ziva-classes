import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-500",
          "focus:border-royal-600 focus:outline-none focus:ring-1 focus:ring-royal-600",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
