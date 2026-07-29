import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client, fetchExchange } from "@urql/core";
import type { Client as UrqlClient, Exchange } from "@urql/core";

import {
  resetNuxtAppStub,
  setRenderSide,
  setRequestHeaders,
} from "#layers/director-gql/test/nuxtApp";

import { persistedFetchExchange } from "../exchanges/persistedFetch";
import type { GqlAppConfig, GqlClientContext } from "../types/appConfig";

import plugin from "./gql";

interface PluginProvide {
  gqlClient: UrqlClient | undefined
  gqlBaseFetchOptions: () => RequestInit
  gqlQueryPromiseCache: Map<string, Promise<unknown>>
}

function boot(gql?: GqlAppConfig): PluginProvide {
  resetNuxtAppStub(gql ? { gql } : {});
  return runSetup();
}

function runSetup(): PluginProvide {
  const setup = (plugin as unknown as { setup: () => { provide: PluginProvide } }).setup;
  return setup().provide;
}

/** Captures the exchange list the plugin assembled, via the app-facing hook. */
function captureExchanges(gql: GqlAppConfig) {
  const seen: { exchanges: Exchange[], context: GqlClientContext }[] = [];

  boot({
    ...gql,
    exchanges: (exchanges, context) => {
      seen.push({ exchanges, context });
      return exchanges;
    },
  });

  return seen[0]!;
}

describe("the gql plugin", () => {
  beforeEach(() => {
    resetNuxtAppStub();
  });

  describe("without gql.url", () => {
    it("does not build a client", () => {
      expect(boot().gqlClient).toBeUndefined();
    });

    it("still provides a promise cache, so nothing downstream explodes on a missing map", () => {
      expect(boot().gqlQueryPromiseCache).toBeInstanceOf(Map);
    });

    it("warns in dev, because a silently inert layer is hard to diagnose", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        boot();
        expect(warn).toHaveBeenCalledOnce();
        expect(String(warn.mock.calls[0]![0])).toMatch(/gql\.url/);
      }
      finally {
        warn.mockRestore();
      }
    });
  });

  describe("with gql.url", () => {
    it("builds a urql client", () => {
      expect(boot({ url: "https://api.test/graphql" }).gqlClient).toBeInstanceOf(Client);
    });

    it("hands the app's own client back untouched when one is configured", () => {
      const mine = new Client({ url: "https://mine.test", exchanges: [fetchExchange] });

      const provided = boot({ url: "https://api.test/graphql", client: () => mine }).gqlClient;

      expect(provided).toBe(mine);
    });

    it("tells the client factory where it is running", () => {
      const factory = vi.fn(
        (_context: GqlClientContext) => new Client({ url: "u", exchanges: [fetchExchange] }),
      );
      setRenderSide("server");
      resetNuxtAppStub({ gql: { url: "https://api.test/graphql", client: factory } });
      setRenderSide("server");
      runSetup();

      expect(factory.mock.calls[0]![0]).toMatchObject({
        url: "https://api.test/graphql",
        operations: "document",
        isServer: true,
      });
    });
  });

  describe("the exchange chain", () => {
    it("uses urql's fetch exchange in document mode", () => {
      const { exchanges } = captureExchanges({ url: "u" });

      expect(exchanges).toEqual([fetchExchange]);
    });

    it("uses the persisted fetch exchange in persisted mode", () => {
      const { exchanges } = captureExchanges({ url: "u", operations: "persisted" });

      expect(exchanges).toEqual([persistedFetchExchange]);
    });

    it("ships no cache exchange — useQuery owns its own state", () => {
      const { exchanges } = captureExchanges({ url: "u" });

      expect(exchanges).toHaveLength(1);
    });

    it("adds a subscription exchange after the fetch one when a transport is configured", () => {
      const { exchanges } = captureExchanges({
        url: "u",
        forwardSubscription: () => () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      });

      expect(exchanges).toHaveLength(2);
      expect(exchanges[0]).toBe(fetchExchange);
    });

    it("never installs a subscription exchange on the server", () => {
      setRenderSide("server");
      const forwardSubscription = vi.fn(() => () => ({
        subscribe: () => ({ unsubscribe: () => {} }),
      }));

      const seen: Exchange[][] = [];
      resetNuxtAppStub({
        gql: {
          url: "u",
          forwardSubscription,
          exchanges: (exchanges) => {
            seen.push(exchanges);
            return exchanges;
          },
        } satisfies GqlAppConfig,
      });
      setRenderSide("server");
      runSetup();

      expect(seen[0]).toHaveLength(1);
      expect(forwardSubscription).not.toHaveBeenCalled();
    });

    it("lets the app reorder and extend the chain", () => {
      const mine: Exchange = ({ forward }) => ops$ => forward(ops$);

      let final: Exchange[] = [];
      resetNuxtAppStub({
        gql: {
          url: "u",
          exchanges: (defaults) => {
            final = [mine, ...defaults];
            return final;
          },
        } satisfies GqlAppConfig,
      });
      runSetup();

      expect(final[0]).toBe(mine);
      expect(final[1]).toBe(fetchExchange);
    });
  });

  describe("the base fetch options", () => {
    it("are the app's, unchanged, on the client", () => {
      const { gqlBaseFetchOptions } = boot({ url: "u" });

      expect(gqlBaseFetchOptions()).toEqual({ credentials: "include" });
    });

    // The server has no cookie jar: without forwarding, an SSR query runs
    // unauthenticated and the first paint disagrees with the client's.
    it("carry the incoming request's cookie on the server", () => {
      setRenderSide("server");
      setRequestHeaders({ cookie: "sid=abc", "user-agent": "spec" });
      resetNuxtAppStub({ gql: { url: "u" } });
      setRenderSide("server");
      setRequestHeaders({ cookie: "sid=abc", "user-agent": "spec" });

      const { gqlBaseFetchOptions } = runSetup();

      expect(gqlBaseFetchOptions()).toEqual({
        credentials: "include",
        headers: { cookie: "sid=abc" },
      });
    });

    it("forward whatever headers the app asked for", () => {
      setRenderSide("server");
      resetNuxtAppStub({ gql: { url: "u", ssrForwardHeaders: ["cookie", "user-agent"] } });
      setRenderSide("server");
      setRequestHeaders({ cookie: "sid=abc", "user-agent": "spec" });

      expect(runSetup().gqlBaseFetchOptions()).toEqual({
        credentials: "include",
        headers: { cookie: "sid=abc", "user-agent": "spec" },
      });
    });

    it("forward nothing when the app opted out", () => {
      setRenderSide("server");
      resetNuxtAppStub({ gql: { url: "u", ssrForwardHeaders: [] } });
      setRenderSide("server");
      setRequestHeaders({ cookie: "sid=abc" });

      expect(runSetup().gqlBaseFetchOptions()).toEqual({ credentials: "include" });
    });
  });
});
