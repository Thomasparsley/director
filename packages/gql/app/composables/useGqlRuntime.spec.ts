import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetNuxtAppStub } from "#layers/director-gql/test/nuxtApp";

import { useGqlRuntime } from "./useGqlRuntime";

describe("useGqlRuntime", () => {
  beforeEach(() => {
    resetNuxtAppStub();
  });

  describe("without configuration", () => {
    it("reports no url", () => {
      expect(useGqlRuntime().hasUrl).toBe(false);
    });

    it("throws a descriptive error when the url is read anyway", () => {
      expect(() => useGqlRuntime().url).toThrow(/gql.url/);
    });

    it("falls back to sensible defaults", () => {
      const runtime = useGqlRuntime();

      expect(runtime.operations).toBe("document");
      // urql's own default is "within-url-limit", which turns queries into GETs; plenty
      // of servers only route POST, so the layer asks rather than assumes.
      expect(runtime.preferGetMethod).toBe(false);
      expect(runtime.ssrCache).toBe(true);
      expect(runtime.variablesDebounce).toEqual({ debounce: 300, maxWait: 500 });
      expect(runtime.ssrForwardHeaders).toEqual(["cookie"]);
      expect(runtime.fetchOptions()).toEqual({ credentials: "include" });
    });

    it("is silent — the default logger and notify do nothing", () => {
      const runtime = useGqlRuntime();

      expect(() => runtime.logger("scope").error("boom")).not.toThrow();
      expect(() => runtime.notify({
        kind: "error",
        title: "t",
        message: "m",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: {} as any,
      })).not.toThrow();
    });

    it("leaves the exchange list alone", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const defaults = ["a", "b"] as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(useGqlRuntime().exchanges(defaults, {} as any)).toBe(defaults);
    });
  });

  describe("with configuration", () => {
    it("resolves a string url", () => {
      resetNuxtAppStub({ gql: { url: "https://api.test/graphql" } });

      expect(useGqlRuntime().hasUrl).toBe(true);
      expect(useGqlRuntime().url).toBe("https://api.test/graphql");
    });

    it("calls a url factory lazily, so it may read runtime config", () => {
      const url = vi.fn(() => "https://api.test/graphql");
      resetNuxtAppStub({ gql: { url } });

      const runtime = useGqlRuntime();
      expect(url).not.toHaveBeenCalled();

      expect(runtime.url).toBe("https://api.test/graphql");
      expect(url).toHaveBeenCalledTimes(1);
    });

    it("merges a partial debounce over the defaults", () => {
      resetNuxtAppStub({ gql: { url: "u", variablesDebounce: { debounce: 50 } } });

      expect(useGqlRuntime().variablesDebounce).toEqual({ debounce: 50, maxWait: 500 });
    });

    it("takes fetch options from a factory, fresh each call", () => {
      let n = 0;
      resetNuxtAppStub({ gql: { url: "u", fetchOptions: () => ({ headers: { n: String(n++) } }) } });

      const runtime = useGqlRuntime();
      expect(runtime.fetchOptions()).toEqual({ headers: { n: "0" } });
      expect(runtime.fetchOptions()).toEqual({ headers: { n: "1" } });
    });

    it("copies static fetch options so a caller cannot mutate the config", () => {
      const configured = { credentials: "omit" as const };
      resetNuxtAppStub({ gql: { url: "u", fetchOptions: configured } });

      const options = useGqlRuntime().fetchOptions();
      options.credentials = "include";

      expect(configured.credentials).toBe("omit");
    });

    it("honours an empty ssrForwardHeaders list rather than falling back", () => {
      resetNuxtAppStub({ gql: { url: "u", ssrForwardHeaders: [] } });

      expect(useGqlRuntime().ssrForwardHeaders).toEqual([]);
    });

    it("lets an app opt into GET queries", () => {
      resetNuxtAppStub({ gql: { url: "u", preferGetMethod: "within-url-limit" } });

      expect(useGqlRuntime().preferGetMethod).toBe("within-url-limit");
    });

    it("honours ssrCache: false", () => {
      resetNuxtAppStub({ gql: { url: "u", ssrCache: false } });

      expect(useGqlRuntime().ssrCache).toBe(false);
    });
  });

  it("memoises per Nuxt app, so every caller sees one runtime", () => {
    resetNuxtAppStub({ gql: { url: "u" } });

    expect(useGqlRuntime()).toBe(useGqlRuntime());
  });

  it("does not leak across Nuxt apps — a new request resolves its own config", () => {
    resetNuxtAppStub({ gql: { url: "first" } });
    const first = useGqlRuntime();

    resetNuxtAppStub({ gql: { url: "second" } });
    const second = useGqlRuntime();

    expect(second).not.toBe(first);
    expect(second.url).toBe("second");
  });
});
