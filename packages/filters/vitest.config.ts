import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "#layers/director-common": fileURLToPath(new URL("../common", import.meta.url)),
      "#layers/director-forms": fileURLToPath(new URL("../forms", import.meta.url)),
    },
  },

  test: {
    // Storage composables register lifecycle hooks, so specs mount a host component.
    environment: "happy-dom",
    include: ["app/**/*.spec.ts"],
  },
});
