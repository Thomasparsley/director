import { describe, expect, it } from "vitest";
import { $fetch, setup, url } from "@nuxt/test-utils/e2e";

import { fixtureDir } from "./fixture";

await setup({ rootDir: fixtureDir, server: true, build: true, browser: false });

describe("the integration fixture", () => {
  it("serves GraphQL over HTTP", async () => {
    const response = await $fetch<{ data: { books: { id: string }[] } }>("/api/graphql", {
      method: "POST",
      body: { query: "{ books { id } }" },
    });

    expect(response.data.books.length).toBeGreaterThan(0);
  });

  it("exposes an absolute URL the layer's server-side client can reach", () => {
    expect(url("/api/graphql")).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):\d+\/api\/graphql$/);
  });
});
