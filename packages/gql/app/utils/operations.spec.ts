import { beforeEach, describe, expect, it, vi } from "vitest";

import { provideToNuxtApp, resetNuxtAppStub } from "#layers/director-gql/test/nuxtApp";

import type { QueryDataPassthrough, QueryResponse } from "../types/query";

import { executeSharedQuery } from "./operations";
import { makeQueryDataPassthrough } from "./query";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Response = QueryResponse<any, string>;

function makeDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const asResponse = (state: QueryDataPassthrough<string>): Response =>
  ({ ...state, refresh: async () => {} });

describe("executeSharedQuery", () => {
  let cache: Map<string, Promise<unknown>>;

  beforeEach(() => {
    resetNuxtAppStub({ gql: { url: "u" } });
    cache = new Map();
    provideToNuxtApp({ $gqlQueryPromiseCache: cache });
  });

  it("runs the query when there is nothing yet", async () => {
    const state = makeQueryDataPassthrough<string>();
    const response = asResponse(state);
    const callback = vi.fn(async () => response);

    await expect(executeSharedQuery(state, callback, { cacheKey: "k" })).resolves.toBe(response);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("does nothing when the data is already there", async () => {
    const state = makeQueryDataPassthrough<string>("cached");
    const callback = vi.fn(async () => asResponse(state));

    await expect(executeSharedQuery(state, callback, { cacheKey: "k" })).resolves.toBeUndefined();
    expect(callback).not.toHaveBeenCalled();
  });

  it("refetches over existing data when forced", async () => {
    const state = makeQueryDataPassthrough<string>("cached");
    const callback = vi.fn(async () => asResponse(state));

    await executeSharedQuery(state, callback, { cacheKey: "k", forceFetch: true });

    expect(callback).toHaveBeenCalledOnce();
  });

  it("collapses concurrent callers onto one request", async () => {
    const state = makeQueryDataPassthrough<string>();
    const response = asResponse(state);
    const deferred = makeDeferred<Response>();

    const callback = vi.fn(() => {
      state.pending.value = true;
      return deferred.promise;
    });

    const first = executeSharedQuery(state, callback, { cacheKey: "k" });
    const second = executeSharedQuery(state, callback, { cacheKey: "k" });

    deferred.resolve(response);

    expect(await first).toBe(response);
    expect(await second).toBe(response);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("keeps different cache keys apart", async () => {
    const state = makeQueryDataPassthrough<string>();
    const deferred = makeDeferred<Response>();
    const callback = vi.fn(() => {
      state.pending.value = true;
      return deferred.promise;
    });

    const first = executeSharedQuery(state, callback, { cacheKey: "a" });
    const second = executeSharedQuery(state, callback, { cacheKey: "b" });

    deferred.resolve(asResponse(state));
    await Promise.all([first, second]);

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("clears the cache entry once settled, so the next caller refetches", async () => {
    const state = makeQueryDataPassthrough<string>();
    const callback = vi.fn(async () => asResponse(state));

    await executeSharedQuery(state, callback, { cacheKey: "k" });

    expect(cache.size).toBe(0);
  });

  describe("when the shared query fails", () => {
    it("answers undefined rather than rethrowing — the error is on the state", async () => {
      const state = makeQueryDataPassthrough<string>();
      const callback = vi.fn(async () => {
        throw new Error("boom");
      });

      await expect(executeSharedQuery(state, callback, { cacheKey: "k" })).resolves.toBeUndefined();
    });

    it("answers undefined for the callers waiting on it too", async () => {
      const state = makeQueryDataPassthrough<string>();
      const deferred = makeDeferred<Response>();
      const callback = vi.fn(() => {
        state.pending.value = true;
        return deferred.promise;
      });

      const first = executeSharedQuery(state, callback, { cacheKey: "k" });
      const second = executeSharedQuery(state, callback, { cacheKey: "k" });

      deferred.reject(new Error("boom"));

      expect(await first).toBeUndefined();
      expect(await second).toBeUndefined();
    });

    it("still clears the cache entry, so a failure is not sticky", async () => {
      const state = makeQueryDataPassthrough<string>();
      const callback = vi.fn(async () => {
        throw new Error("boom");
      });

      await executeSharedQuery(state, callback, { cacheKey: "k" });

      expect(cache.size).toBe(0);
    });
  });
});
