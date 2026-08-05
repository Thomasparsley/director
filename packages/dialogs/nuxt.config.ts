// @directorkit/dialogs — imperative dialog layer: register any component as a modal or sheet
// and open/close it from anywhere, without the caller owning a `v-if` or a wrapper element.
// The layer owns dialog *state*; painting it is the consumer's job (see README).
// Pure logic, no components.
// https://nuxt.com/docs/getting-started/layers
export default defineNuxtConfig({
  $meta: {
    name: "director-dialogs",
  },

  extends: [
    "@directorkit/common",
  ],
});
