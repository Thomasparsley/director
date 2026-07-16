// @director/forms — reactive form model layer: controls, groups, validators, transformers.
// Pure logic, no components. Built on @director/common.
// https://nuxt.com/docs/getting-started/layers
export default defineNuxtConfig({
  $meta: {
    name: "director-forms",
  },

  extends: [
    "@director/common",
  ],
});
