import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-500",
        "focus:border-royal-600 focus:outline-none focus:ring-1 focus:ring-royal-600",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
