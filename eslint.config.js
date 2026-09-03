const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");

// Migrated from .eslintrc.json ({ "extends": "next/core-web-vitals" }) —
// ESLint 10 dropped the legacy .eslintrc format, and Next 16 dropped the
// `next lint` command that used to auto-apply it and its default ignores.
module.exports = [
  { ignores: [".next/**", "node_modules/**", "public/**"] },
  ...nextCoreWebVitals,
];
