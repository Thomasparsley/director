import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "#layers/director-common": fileURLToPath(new URL("../common", import.meta.url)),
      "#layers/director-dialogs": fileURLToPath(new URL(".", import.meta.url)),

      // `#app` only exists inside a Nuxt build. `useDialogManager` reaches through it for the
      // manager the plugin provides, so specs get a stub they can point at a manager of their
      // own — the same "re-supply only what the code touches" trade as core's `#components`.
      "#app": fileURLToPath(new URL("./test/nuxtApp.ts", import.meta.url)),
    },
  },

  test: {
    // useDialogInstance registers an onUnmounted hook, so specs mount a host component.
    environment: "happy-dom",
    include: ["app/**/*.spec.ts"],
  },
});
