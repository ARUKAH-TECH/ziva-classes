import { User } from "lucide-react";
import { cn } from "@/lib/utils";

export function StudentAvatar({
  url,
  name,
  size = 36,
  className,
}: {
  url: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  if (url) {
    return (
      // signed URLs are short-lived and per-request; next/image's cache would fight that
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-full border border-gray-300 object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-ink-500",
        className
      )}
      style={{ width: size, height: size }}
      aria-label={`${name} — no photo`}
    >
      <User style={{ width: size * 0.5, height: size * 0.5 }} />
    </span>
  );
}
