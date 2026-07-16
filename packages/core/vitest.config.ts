import { fileURLToPath } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      "#layers/director-common": fileURLToPath(new URL("../common", import.meta.url)),
      "#layers/director-ui": fileURLToPath(new URL("../ui", import.meta.url)),
      // Nuxt's virtual component registry does not exist outside a Nuxt build. The stub maps
      // NuxtLink onto RouterLink, which is what NuxtLink renders to for internal routes anyway.
      "#components": fileURLToPath(new URL("./test/stubs/components.ts", import.meta.url)),
    },
  },

  test: {
    environment: "happy-dom",
    include: ["app/**/*.spec.ts"],
    setupFiles: [fileURLToPath(new URL("./test/setup.ts", import.meta.url))],
  },
});
