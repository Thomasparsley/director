// @directorkit/filters — page-level filter state built on @directorkit/forms: a filter is a form
// group whose data can be persisted to the URL query (per-field or as one serialized param).
// Pure logic, no components.
// https://nuxt.com/docs/getting-started/layers
export default defineNuxtConfig({
  $meta: {
    name: "director-filters",
  },

  extends: [
    "@directorkit/forms",
  ],
});
