import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "#layers/director-common": fileURLToPath(new URL("../common", import.meta.url)),
      "#layers/director-identity": fileURLToPath(new URL(".", import.meta.url)),

      // `#app` only exists inside a Nuxt build. The session store and the runtime-config
      // resolver reach through it (useState/useCookie/useNuxtApp/useAppConfig), so specs
      // get a stub that re-supplies only what the code touches — the same trade as
      // dialogs' `#app` stub.
      "#app": fileURLToPath(new URL("./test/nuxtApp.ts", import.meta.url)),
    },
  },

  test: {
    environment: "happy-dom",
    include: ["app/**/*.spec.ts"],
  },
});
