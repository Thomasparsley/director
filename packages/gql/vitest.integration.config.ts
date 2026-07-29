import { defineConfig } from "vitest/config";

import { layerAliases, nuxtImportMeta } from "./vitest.shared";

/**
 * The integration tier: the layer driven against a REAL Nuxt server.
 *
 * `test/fixture` is a minimal Nuxt app extending this layer and serving GraphQL over both
 * HTTP and a WebSocket; `@nuxt/test-utils/e2e` builds it once and starts it, and the specs
 * talk to it over the network. No browser is involved — the client under test runs right
 * here in Node, which is what makes this tier cheap enough to sit between the unit specs
 * and the playground's Playwright suite (ADR-0022).
 */
export default defineConfig({
  plugins: [nuxtImportMeta()],

  resolve: {
    alias: layerAliases,
  },

  test: {
    environment: "node",
    include: ["test/integration/**/*.spec.ts"],

    // @nuxt/test-utils registers its own beforeAll/afterAll through the global runner.
    globals: true,

    // One server, one in-memory shelf: specs would otherwise race each other's mutations.
    fileParallelism: false,

    // The first hook builds the fixture; individual requests are local and quick.
    hookTimeout: 240_000,
    testTimeout: 30_000,
  },
});
