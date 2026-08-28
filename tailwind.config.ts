import type { Config } from "tailwindcss";

// ZIVA brand tokens — sampled from the official logo (public/images/ziva-logo-original.jpg)
// Blue + white must dominate; gold stays a premium accent, never a status color.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0A1F44", // sidebar, header, primary headings
          700: "#123163",
        },
        royal: {
          600: "#0B5FA5", // primary buttons, active nav, links
          500: "#1471BE",
        },
        sky: {
          400: "#2B93D1", // info states, charts, secondary highlights
          300: "#5FB0DE",
        },
        gold: {
          700: "#8F630F", // darkened for WCAG AA text contrast (4.5:1+ on white) — use for gold text/labels
          500: "#B8873C", // premium accent only — stats, dividers, report accents, badge backgrounds (not for small text)
          100: "#F1E4C8",
        },
        surface: "#F7F8FA",
        gray: {
          100: "#EEF1F4",
          300: "#DCE1E8",
        },
        ink: {
          900: "#101828", // body text
          500: "#5B6472", // metadata/secondary text
        },
        success: "#16A34A",
        warning: "#F59E0B",
        error: "#DC2626",
      },
      fontFamily: {
        heading: ["var(--font-poppins)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "8px",
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
