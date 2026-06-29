// Playground app — extends @director/core (→ @director/ui → @director/common) so you can
// develop and verify the whole layer chain together: `pnpm dev` from the repo root.
export default defineNuxtConfig({
  extends: [
    "@director/core",
  ],

  devtools: { enabled: true },
  compatibilityDate: "2025-11-16",

  css: [
    "@unocss/reset/tailwind-compat.css",
  ],
});
