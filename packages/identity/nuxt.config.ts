// @directorkit/identity — session/auth layer: one owner of session state (status, user,
// token expiry) with pure, dependency-injected logic around it. The app supplies the
// backend through the `IdentityApi` interface in `app.config` (`identity.api`) — the
// layer never assumes a transport, so REST, GraphQL or a mock all plug in the same way.
// Pure logic, no components.
// https://nuxt.com/docs/getting-started/layers
export default defineNuxtConfig({
  $meta: {
    name: "director-identity",
  },

  extends: [
    "@directorkit/common",
  ],
});
