import { fileURLToPath } from "node:url";

// @directorkit/ui — component kit + design tokens. Built on @directorkit/common.
// Components are auto-registered with the `D` prefix (e.g. <DButton>).
// https://nuxt.com/docs/getting-started/layers
export default defineNuxtConfig({
  $meta: {
    name: "director-ui",
  },

  extends: [
    "@directorkit/common",
  ],

  modules: [
    "@unocss/nuxt",
    "@nuxtjs/color-mode",
    "nuxt-lucide-icons",
  ],

  components: [
    {
      // <DButton>, <DInput>, ...
      path: fileURLToPath(new URL("./app/components", import.meta.url)),
      prefix: "D",
      pathPrefix: false,
    },
  ],

  colorMode: {
    classSuffix: "",
  },

  lucide: {
    namePrefix: "Icon",
  },
});
