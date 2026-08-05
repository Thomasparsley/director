// @directorkit/forms — reactive form model layer: controls, groups, validators, transformers.
// Pure logic, no components. Built on @directorkit/common.
// https://nuxt.com/docs/getting-started/layers
export default defineNuxtConfig({
  $meta: {
    name: "director-forms",
  },

  extends: [
    "@directorkit/common",
  ],
});
