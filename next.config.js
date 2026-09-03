/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 16's `next dev` auto-writes AGENTS.md/CLAUDE.md scaffold files on
  // every dev-server start. Not something this project wants generated
  // into the repo root unattended.
  agentRules: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  // @react-pdf/renderer pulls in pdfkit, which lazily requires its standard
  // font files (Helvetica.cjs etc.) at runtime rather than importing them
  // statically — Next's file tracer can't see that dynamic require, so
  // without this the font files are silently missing from the deployed
  // serverless function and every PDF route crashes with MODULE_NOT_FOUND
  // the moment it actually tries to render text. Both /api/payments/[id]/receipt
  // and /api/terminal-reports/[id]/pdf need this.
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/pdfkit/js/standard-fonts/**/*"],
  },
};

module.exports = nextConfig;
