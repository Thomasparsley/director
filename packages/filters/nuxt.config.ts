// @director/filters — page-level filter state built on @director/forms: a filter is a form
// group whose data can be persisted to the URL query (per-field or as one serialized param).
// Pure logic, no components.
// https://nuxt.com/docs/getting-started/layers
export default defineNuxtConfig({
  $meta: {
    name: "director-filters",
  },

  extends: [
    "@director/forms",
  ],
});
