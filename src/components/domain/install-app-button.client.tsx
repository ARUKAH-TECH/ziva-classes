"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

// Chrome/Android/Edge fire this before showing their own (easy-to-miss)
// address-bar install icon — capturing it lets us show an actual button
// instead of relying on the user noticing that icon. Not in lib.dom.d.ts.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(true); // default hidden until checked, avoids a flash
  const [isIos, setIsIos] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    setIsIos(/iPad|iPhone|iPod/.test(window.navigator.userAgent) && !("MSStream" in window));

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    function handleInstalled() {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  // Nothing to offer: already installed, or a browser that supports
  // neither the install prompt nor iOS's manual Add to Home Screen (e.g.
  // desktop Safari/Firefox).
  if (isStandalone || (!deferredPrompt && !isIos)) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setShowIosHint((v) => !v);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded border border-royal-600 px-2.5 py-1.5 text-xs font-medium text-royal-600 transition-colors hover:bg-royal-600/10 sm:text-sm"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span>Install App</span>
      </button>

      {showIosHint && (
        <div className="absolute right-0 top-full z-10 mt-2 w-64 rounded border border-gray-300 bg-white p-3 text-xs text-ink-900 shadow-card">
          Tap the <strong>Share</strong> icon in Safari, then <strong>&quot;Add to Home Screen&quot;</strong>.
        </div>
      )}
    </div>
  );
}
