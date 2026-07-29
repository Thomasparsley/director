import { defineConfig } from "vitest/config";

import { layerAliases, nuxtImportMeta } from "./vitest.shared";

// The fast tier: pure unit specs, no server, no build. `test/integration/**` is a separate
// config (`vitest.integration.config.ts`) because it boots a real Nuxt app and pays for a
// build — see ADR-0022.
export default defineConfig({
  plugins: [nuxtImportMeta()],

  resolve: {
    alias: layerAliases,
  },

  test: {
    environment: "happy-dom",
    include: ["app/**/*.spec.ts", "transports/**/*.spec.ts"],
  },
});
