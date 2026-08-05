// @directorkit/gql — the GraphQL layer: one urql client per app, built from `app.config`
// (`gql`), plus typed query / mutation / subscription composables on top of it. The app
// owns its schema binding (`initGraphQLTada`) and its endpoint; the layer owns the client,
// the SSR payload cache, the operation keys and the request lifecycle. Every server is
// different, so nothing about the transport is assumed — see ADR-0021.
// Pure logic, no components.
// https://nuxt.com/docs/getting-started/layers
export default defineNuxtConfig({
  $meta: {
    name: "director-gql",
  },

  extends: [
    "@directorkit/common",
  ],
});
