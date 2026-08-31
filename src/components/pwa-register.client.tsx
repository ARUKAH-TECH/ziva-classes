"use client";

import { useEffect } from "react";

// Registers the no-op service worker (public/sw.js) — required for Chrome/
// Android to offer the "Add to Home Screen" / install prompt alongside the
// web manifest. No UI, nothing rendered.
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
