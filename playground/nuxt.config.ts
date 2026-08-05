// Playground app — extends @directorkit/core (→ @directorkit/ui → @directorkit/common) so you can
// develop and verify the whole layer chain together: `pnpm dev` from the repo root.
export default defineNuxtConfig({
  extends: [
    "@directorkit/core",
    "@directorkit/ui",
    "@directorkit/forms",
    "@directorkit/form-ui",
    "@directorkit/filters",
    "@directorkit/dialogs",
    "@directorkit/identity",
    "@directorkit/gql",
  ],

  devtools: { enabled: true },
  compatibilityDate: "2025-11-16",

  css: [
    "@unocss/reset/tailwind-compat.css",
  ],
});
