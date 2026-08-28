import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  error: "bg-red-50 border-error/30 text-error",
  success: "bg-green-50 border-success/30 text-success",
  info: "bg-sky-50 border-sky-400/30 text-sky-400",
  warning: "bg-amber-50 border-warning/30 text-warning",
} as const;

const icons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
} as const;

export function Alert({
  variant = "info",
  className,
  children,
}: {
  variant?: keyof typeof styles;
  className?: string;
  children: React.ReactNode;
}) {
  const Icon = icons[variant];
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded border px-3 py-2 text-sm",
        styles[variant],
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
