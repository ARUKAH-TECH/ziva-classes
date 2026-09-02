import { cn } from "@/lib/utils";

// Shown app-wide (dashboard shell + auth pages) per organization requirement —
// not editable via Settings, unlike org-facing content.
export function AppFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className={cn("py-4 text-center text-xs text-ink-500 print:hidden", className)}>
      <p>&copy; {year} ZIVA Online &amp; Special Classes. All rights reserved.</p>
      <p className="mt-0.5">
        Developed by{" "}
        <span className="font-medium text-navy-900">Arukah Tech</span> &middot; 0597573842 &middot;{" "}
        <a href="mailto:arukahtech@gmail.com" className="text-royal-600 hover:underline">
          arukahtech@gmail.com
        </a>
      </p>
    </footer>
  );
}
