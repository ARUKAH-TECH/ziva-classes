import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "royal",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "royal" | "gold" | "sky" | "success" | "warning" | "error";
}) {
  const accentClass = {
    royal: "bg-royal-600/10 text-royal-600",
    gold: "bg-gold-500/10 text-gold-500",
    sky: "bg-sky-400/10 text-sky-400",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    error: "bg-error/10 text-error",
  }[accent];

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded", accentClass)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
          <p className="text-xl font-semibold text-navy-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}
