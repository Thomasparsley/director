/**
 * The integration fixture: the smallest Nuxt app that extends `@director/gql` and serves
 * it a real GraphQL server.
 *
 * Deliberately minimal — no UI layer, no UnoCSS, one page — because its whole job is to
 * put a real Nitro server and a real Nuxt runtime under the layer. The playground is
 * where the layers are seen working *together* (ADR-0009); this is where the gql layer is
 * exercised *alone*, over real HTTP and a real socket.
 */
import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  // The layer under test. Absolute, not `"../.."`: a relative `extends` is resolved
  // against a base that shifts with the srcDir convention, and silently pointed one
  // directory short of the package.
  extends: [fileURLToPath(new URL("../..", import.meta.url))],

  compatibilityDate: "2025-11-16",

  nitro: {
    // Required for `defineWebSocketHandler` to bind; Nitro's WebSocket support is
    // crossws-based and off by default.
    experimental: {
      websocket: true,
    },
  },
});
