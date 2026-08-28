import { cn } from "@/lib/utils";

const styles = {
  neutral: "bg-gray-100 text-ink-500",
  royal: "bg-royal-600/10 text-royal-600",
  gold: "bg-gold-500/10 text-gold-700",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
} as const;

export function Badge({
  variant = "neutral",
  className,
  children,
}: {
  variant?: keyof typeof styles;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
