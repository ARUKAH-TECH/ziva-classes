import type { MetadataRoute } from "next";

// Next.js serves this at /manifest.webmanifest — what makes the site
// installable to a phone's home screen (Android "Add to Home Screen" /
// install prompt, iOS Safari "Add to Home Screen") without going through
// the Play Store or App Store.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ZIVA Online & Special Classes",
    short_name: "ZIVA",
    description: "Excellence Our Hallmark — ZIVA Special Classes Management System",
    start_url: "/",
    display: "standalone",
    background_color: "#0A1F44",
    theme_color: "#0A1F44",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
