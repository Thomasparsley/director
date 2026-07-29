import { describe, expect, it } from "vitest";
import { $fetch, setup } from "@nuxt/test-utils/e2e";

import { fixtureDir } from "./fixture";

await setup({ rootDir: fixtureDir, server: true, build: true, browser: false });

/**
 * The other half of the integration tier: not the layer driven from Node, but the layer
 * running *inside* a rendering Nuxt app.
 *
 * `/books` awaits `useQueryAsync` in setup, so serving it exercises the whole chain —
 * plugin boot, the server-side client, a real HTTP round trip to the fixture's own
 * GraphQL route, and the SSR payload — and the rendered HTML is the proof.
 */
describe("server-side rendering", () => {
  it("renders data the server fetched over HTTP", async () => {
    const html = await $fetch<string>("/books");

    expect(html).toContain("Refactoring");
    expect(html).toContain("The Mythical Man-Month");
  });

  // Without this the SSR render would be anonymous while the client's is not, which is
  // exactly the class of bug the forwarding exists to prevent.
  it("forwards the incoming request's cookie to the GraphQL server", async () => {
    const html = await $fetch<string>("/books", {
      headers: { cookie: "session=ssr-visitor" },
    });

    expect(html).toContain("ssr-visitor");
  });

  it("renders anonymously when the visitor has no session", async () => {
    const html = await $fetch<string>("/books");

    expect(html).toContain("anonymous");
  });

  // The result is in the payload, which is what lets hydration reuse it instead of
  // fetching the same query a second time.
  it("puts the result in the SSR payload", async () => {
    const html = await $fetch<string>("/books");

    const payload = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];

    expect(payload).toBeDefined();
    expect(payload).toContain("Refactoring");
  });
});
