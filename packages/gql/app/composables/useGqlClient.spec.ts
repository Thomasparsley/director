import { beforeEach, describe, expect, it } from "vitest";

import { provideToNuxtApp, resetNuxtAppStub } from "#layers/director-gql/test/nuxtApp";

import { useGqlBaseFetchOptions, useGqlClient, useGqlQueryPromiseCache } from "./useGqlClient";

describe("useGqlClient", () => {
  beforeEach(() => {
    resetNuxtAppStub();
  });

  // The plugin provides `undefined` rather than nothing when `gql.url` is missing, so the
  // failure surfaces here with a message that names the fix — not as a confusing
  // `undefined` deeper inside a query.
  it("throws a message naming the missing config when the plugin did not boot", () => {
    expect(() => useGqlClient()).toThrow(/gql\.url/);
  });

  it("hands back the client the plugin provided", () => {
    const client = { marker: true };
    provideToNuxtApp({ $gqlClient: client });

    expect(useGqlClient()).toBe(client);
  });
});

describe("useGqlBaseFetchOptions", () => {
  beforeEach(() => {
    resetNuxtAppStub();
  });

  it("returns the provided options, resolved fresh on each call", () => {
    let n = 0;
    provideToNuxtApp({ $gqlBaseFetchOptions: () => ({ headers: { n: String(n++) } }) });

    expect(useGqlBaseFetchOptions()).toEqual({ headers: { n: "0" } });
    expect(useGqlBaseFetchOptions()).toEqual({ headers: { n: "1" } });
  });

  // Unlike the client, empty options are harmless — a request without them still goes out.
  it("falls back to empty options rather than throwing", () => {
    expect(useGqlBaseFetchOptions()).toEqual({});
  });
});

describe("useGqlQueryPromiseCache", () => {
  beforeEach(() => {
    resetNuxtAppStub();
  });

  it("hands back the one cache the plugin created", () => {
    const cache = new Map<string, Promise<unknown>>();
    provideToNuxtApp({ $gqlQueryPromiseCache: cache });

    expect(useGqlQueryPromiseCache()).toBe(cache);
  });

  it("throws when the layer is not in `extends` at all", () => {
    expect(() => useGqlQueryPromiseCache()).toThrow(/extends/);
  });
});
