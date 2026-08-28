import Image from "next/image";
import { cn } from "@/lib/utils";

// Renders the official ZIVA logo file as-is. Never redesign, recolor,
// stretch, or rotate this asset — only uniform scaling is permitted.
// Source: public/images/ziva-logo-original.jpg (272x278px, supplied asset).
export function ZivaLogo({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/images/ziva-logo-original.jpg"
      alt="ZIVA Online & Special Classes — Excellence Our Hallmark"
      width={size}
      height={size}
      className={cn("rounded-full object-contain", className)}
      priority
    />
  );
}
