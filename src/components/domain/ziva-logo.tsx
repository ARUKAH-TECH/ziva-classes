import Image from "next/image";
import { cn } from "@/lib/utils";

// Renders the official ZIVA logo file as-is. Never redesign, recolor,
// stretch, or rotate this asset — only uniform scaling is permitted.
// Source: public/images/ziva-logo-original.jpg (272x278px, supplied asset).
// On-screen UI uses ziva-logo.png, a transparent-background derivative
// (flood-filled from the original's near-white backdrop, badge artwork
// untouched) so the badge sits cleanly on the navy/gold interface
// background instead of carrying its own white square. PDF/print output
// still embeds the original opaque JPG (see the terminal-reports and
// receipt routes) since print pages are white anyway.
export function ZivaLogo({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/images/ziva-logo.png"
      alt="ZIVA Online & Special Classes — Excellence Our Hallmark"
      width={size}
      height={size}
      className={cn("rounded-full object-contain", className)}
      priority
    />
  );
}
