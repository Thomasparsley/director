import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "#layers/director-common": fileURLToPath(new URL("../common", import.meta.url)),
    },
  },

  test: {
    include: ["app/**/*.spec.ts"],
  },
});
