import { fileURLToPath } from "node:url";

// @director/core — pre-built administration building blocks (shells, CRUD / table / form
// scaffolds). Built on @director/ui. Apps customize via Nuxt layer overrides, not forking.
// https://nuxt.com/docs/getting-started/layers
export default defineNuxtConfig({
  $meta: {
    name: "director-core",
  },

  extends: [
    "@director/ui",
  ],

  components: [
    {
      // <DAppShell>, ... — admin building blocks, sharing the `D` prefix.
      path: fileURLToPath(new URL("./app/components", import.meta.url)),
      prefix: "D",
      pathPrefix: false,
    },
  ],
});
