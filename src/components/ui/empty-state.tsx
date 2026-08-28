import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-gray-300 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-ink-500">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-navy-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
    </div>
  );
}
