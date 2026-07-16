import { fileURLToPath } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      "#layers/director-common": fileURLToPath(new URL("../common", import.meta.url)),
      "#layers/director-ui": fileURLToPath(new URL(".", import.meta.url)),
    },
  },

  test: {
    environment: "happy-dom",
    include: ["app/**/*.spec.ts"],
    setupFiles: [fileURLToPath(new URL("./test/setup.ts", import.meta.url))],
  },
});
