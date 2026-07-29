import { beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "graphql";
import { CombinedError } from "@urql/core";
import type { TadaDocumentNode } from "gql.tada";

import {
  nuxtPayloadData,
  provideToNuxtApp,
  resetNuxtAppStub,
  setHydrating,
  setRenderSide,
} from "#layers/director-gql/test/nuxtApp";
import { makeFakeClient } from "#layers/director-gql/test/fakeClient";
import type { FakeClient } from "#layers/director-gql/test/fakeClient";

import type { QueryOptions, QueryResponse } from "../types/query";

import { executeQuery, makeQueryDataPassthrough, makeQueryStoreData } from "./query";
import { makeGraphqlDocumentOperationKey } from "./operationKey";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = TadaDocumentNode<any, any>;

const findUser = parse("query FindUser($id: ID!) { user(id: $id) { id name } }") as AnyNode;

interface UserData {
  user: { id: string, name: string }
}

const userResult: UserData = { user: { id: "1", name: "Ada" } };

function makeAsyncData<Data>(): QueryResponse<AnyNode, Data> {
  return {
    ...makeQueryDataPassthrough<Data>(),
    refresh: async () => {},
  };
}

function install(client: FakeClient, fetchOptions: RequestInit = { credentials: "include" }) {
  provideToNuxtApp({
    $gqlClient: client,
    $gqlBaseFetchOptions: () => fetchOptions,
    $gqlQueryPromiseCache: new Map(),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const opts = <T>(value: T) => value as any as QueryOptions<AnyNode, any>;

describe("makeQueryDataPassthrough", () => {
  it("starts empty and idle", () => {
    const state = makeQueryDataPassthrough<UserData>();

    expect(state.data.value).toBeUndefined();
    expect(state.error.value).toBeUndefined();
    expect(state.pending.value).toBe(false);
  });

  it("seeds the data ref when given a default", () => {
    expect(makeQueryDataPassthrough(userResult).data.value).toEqual(userResult);
  });
});

describe("makeQueryStoreData", () => {
  it("is the same three fields, unwrapped", () => {
    expect(makeQueryStoreData<UserData>()).toEqual({
      data: undefined,
      error: undefined,
      pending: false,
    });
  });
});

describe("executeQuery", () => {
  beforeEach(() => {
    resetNuxtAppStub({ gql: { url: "https://api.test/graphql" } });
  });

  describe("on success", () => {
    it("writes the data and clears pending", async () => {
      install(makeFakeClient({ result: { data: userResult } }));
      const asyncData = makeAsyncData<UserData>();

      await executeQuery(findUser, asyncData, opts({ variables: { id: "1" } }));

      expect(asyncData.data.value).toEqual(userResult);
      expect(asyncData.error.value).toBeUndefined();
      expect(asyncData.pending.value).toBe(false);
    });

    it("applies the transform", async () => {
      install(makeFakeClient({ result: { data: userResult } }));
      const asyncData = makeAsyncData<string>();

      await executeQuery(findUser, asyncData, opts({
        variables: { id: "1" },
        transform: (data: UserData) => data.user.name,
      }));

      expect(asyncData.data.value).toBe("Ada");
    });

    it("sends the base fetch options as the operation CONTEXT, not as the context "
      + "itself — otherwise credentials and forwarded cookies are silently dropped", async () => {
      const client = makeFakeClient({ result: { data: userResult } });
      install(client, { credentials: "include", headers: { cookie: "sid=1" } });

      await executeQuery(findUser, makeAsyncData<UserData>(), opts({ variables: { id: "1" } }));

      expect(client.contexts[0]).toEqual({
        fetchOptions: { credentials: "include", headers: { cookie: "sid=1" } },
      });
    });

    // urql cross-checks the kind against the document's AST in dev; upstream hardcoded
    // `undefined`, which only ever matched a persisted document.
    it("names the operation kind for a plain document", async () => {
      const client = makeFakeClient({ result: { data: userResult } });
      install(client);

      await executeQuery(findUser, makeAsyncData<UserData>(), opts({ variables: { id: "1" } }));

      expect((client.executed[0] as { kind: string }).kind).toBe("query");
    });

    it("leaves the kind undefined for a persisted document, matching its stripped AST", async () => {
      const client = makeFakeClient({ result: { data: userResult } });
      install(client);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const persisted = { documentId: "abc", kind: "Document", definitions: [] } as any;

      await executeQuery(persisted, makeAsyncData<UserData>(), opts({ variables: { id: "1" } }));

      expect((client.executed[0] as { kind: string | undefined }).kind).toBeUndefined();
    });

    it("merges an abort signal into the fetch options", async () => {
      const client = makeFakeClient({ result: { data: userResult } });
      install(client);
      const controller = new AbortController();

      await executeQuery(findUser, makeAsyncData<UserData>(), opts({
        variables: { id: "1" },
        signal: controller.signal,
      }));

      expect(client.contexts[0]).toEqual({
        fetchOptions: { credentials: "include", signal: controller.signal },
      });
    });
  });

  describe("on failure", () => {
    it("surfaces the error and calls onError", async () => {
      const error = new CombinedError({ graphQLErrors: ["boom"] });
      install(makeFakeClient({ result: { error } }));
      const onError = vi.fn();
      const asyncData = makeAsyncData<UserData>();

      await executeQuery(findUser, asyncData, opts({ variables: { id: "1" }, onError }));

      expect(asyncData.error.value).toBe(error);
      expect(asyncData.data.value).toBeUndefined();
      expect(asyncData.pending.value).toBe(false);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it("resolves rather than rejecting — the caller reads the error off the state", async () => {
      install(makeFakeClient({ result: { error: new CombinedError({ networkError: new Error("offline") }) } }));

      await expect(
        executeQuery(findUser, makeAsyncData<UserData>(), opts({ variables: { id: "1" } })),
      ).resolves.toBeUndefined();
    });
  });

  // A run supersedes the last one's outcome. Without this, `refresh()` after a failure
  // leaves the old error next to fresh data and a template watching `error` never recovers.
  describe("state from a previous run", () => {
    it("clears a stale error once a later run succeeds", async () => {
      const asyncData = makeAsyncData<UserData>();

      install(makeFakeClient({ result: { error: new CombinedError({ graphQLErrors: ["boom"] }) } }));
      await executeQuery(findUser, asyncData, opts({ variables: { id: "1" } }));
      expect(asyncData.error.value).toBeDefined();

      install(makeFakeClient({ result: { data: userResult } }));
      await executeQuery(findUser, asyncData, opts({ variables: { id: "1" } }));

      expect(asyncData.data.value).toEqual(userResult);
      expect(asyncData.error.value).toBeUndefined();
    });

    it("clears a stale error when hydrating from the payload", async () => {
      const asyncData = makeAsyncData<UserData>();

      install(makeFakeClient({ result: { error: new CombinedError({ graphQLErrors: ["boom"] }) } }));
      await executeQuery(findUser, asyncData, opts({ variables: { id: "1" } }));
      expect(asyncData.error.value).toBeDefined();

      nuxtPayloadData()[makeGraphqlDocumentOperationKey(findUser, { id: "1" })] = userResult;
      setHydrating(true);
      await executeQuery(findUser, asyncData, opts({ variables: { id: "1" } }));

      expect(asyncData.error.value).toBeUndefined();
    });

    it("keeps the last good data when a later run fails, so the page does not blank", async () => {
      const asyncData = makeAsyncData<UserData>();

      install(makeFakeClient({ result: { data: userResult } }));
      await executeQuery(findUser, asyncData, opts({ variables: { id: "1" } }));

      install(makeFakeClient({ result: { error: new CombinedError({ graphQLErrors: ["boom"] }) } }));
      await executeQuery(findUser, asyncData, opts({ variables: { id: "1" } }));

      expect(asyncData.data.value).toEqual(userResult);
      expect(asyncData.error.value).toBeDefined();
    });
  });

  describe("a request timeout", () => {
    it("is not imposed by default", async () => {
      const client = makeFakeClient({ result: { data: userResult } });
      install(client);

      await executeQuery(findUser, makeAsyncData<UserData>(), opts({ variables: { id: "1" } }));

      expect(client.contexts[0]).toEqual({ fetchOptions: { credentials: "include" } });
    });

    it("sends a timeout signal when the app configured one", async () => {
      resetNuxtAppStub({ gql: { url: "u", requestTimeoutMs: 5_000 } });
      const client = makeFakeClient({ result: { data: userResult } });
      install(client);

      await executeQuery(findUser, makeAsyncData<UserData>(), opts({ variables: { id: "1" } }));

      const context = client.contexts[0] as { fetchOptions: { signal?: AbortSignal } };
      expect(context.fetchOptions.signal).toBeInstanceOf(AbortSignal);
      expect(context.fetchOptions.signal!.aborted).toBe(false);
    });

    it("aborts the query once the budget passes", async () => {
      resetNuxtAppStub({ gql: { url: "u", requestTimeoutMs: 20 } });
      install(makeFakeClient({ pendingForever: true }));
      const asyncData = makeAsyncData<UserData>();

      await executeQuery(findUser, asyncData, opts({ variables: { id: "1" } }));

      expect(asyncData.pending.value).toBe(false);
      expect(asyncData.data.value).toBeUndefined();
    });
  });

  describe("the SSR payload cache", () => {
    it("writes the result into the payload on the server", async () => {
      setRenderSide("server");
      install(makeFakeClient({ result: { data: userResult } }));

      await executeQuery(findUser, makeAsyncData<UserData>(), opts({ variables: { id: "1" } }));

      const key = makeGraphqlDocumentOperationKey(findUser, { id: "1" });
      expect(nuxtPayloadData()[key]).toEqual(userResult);
    });

    it("reads the payload while hydrating, without touching the client", async () => {
      const key = makeGraphqlDocumentOperationKey(findUser, { id: "1" });
      nuxtPayloadData()[key] = userResult;
      setHydrating(true);

      const client = makeFakeClient({ result: { data: { user: { id: "2", name: "Grace" } } } });
      install(client);
      const asyncData = makeAsyncData<UserData>();

      await executeQuery(findUser, asyncData, opts({ variables: { id: "1" } }));

      expect(asyncData.data.value).toEqual(userResult);
      expect(client.executed).toHaveLength(0);
    });

    it("does not read a payload written under different variables", async () => {
      nuxtPayloadData()[makeGraphqlDocumentOperationKey(findUser, { id: "9" })] = userResult;
      setHydrating(true);

      const client = makeFakeClient({ result: { data: userResult } });
      install(client);

      await executeQuery(findUser, makeAsyncData<UserData>(), opts({ variables: { id: "1" } }));

      expect(client.executed).toHaveLength(1);
    });

    // The key is document + variables, so two call sites shaping the same document
    // differently would collide. Storing the RAW response lets one entry serve both.
    it("stores the untransformed response", async () => {
      setRenderSide("server");
      install(makeFakeClient({ result: { data: userResult } }));
      const asyncData = makeAsyncData<string>();

      await executeQuery(findUser, asyncData, opts({
        variables: { id: "1" },
        transform: (data: UserData) => data.user.name,
      }));

      expect(asyncData.data.value).toBe("Ada");
      expect(nuxtPayloadData()[makeGraphqlDocumentOperationKey(findUser, { id: "1" })])
        .toEqual(userResult);
    });

    it("applies the caller's transform when hydrating", async () => {
      nuxtPayloadData()[makeGraphqlDocumentOperationKey(findUser, { id: "1" })] = userResult;
      setHydrating(true);
      const client = makeFakeClient({ result: { data: userResult } });
      install(client);
      const asyncData = makeAsyncData<string>();

      await executeQuery(findUser, asyncData, opts({
        variables: { id: "1" },
        transform: (data: UserData) => data.user.name,
      }));

      expect(asyncData.data.value).toBe("Ada");
      expect(client.executed).toHaveLength(0);
    });

    it("serves two different transforms of the same document from one entry", async () => {
      nuxtPayloadData()[makeGraphqlDocumentOperationKey(findUser, { id: "1" })] = userResult;
      setHydrating(true);
      install(makeFakeClient({ result: { data: userResult } }));

      const name = makeAsyncData<string>();
      const id = makeAsyncData<string>();

      await executeQuery(findUser, name, opts({
        variables: { id: "1" },
        transform: (data: UserData) => data.user.name,
      }));
      await executeQuery(findUser, id, opts({
        variables: { id: "1" },
        transform: (data: UserData) => data.user.id,
      }));

      expect(name.data.value).toBe("Ada");
      expect(id.data.value).toBe("1");
    });

    it("skips the cache for a query that asked to", async () => {
      const key = makeGraphqlDocumentOperationKey(findUser, { id: "1" });
      nuxtPayloadData()[key] = userResult;
      setHydrating(true);

      const client = makeFakeClient({ result: { data: userResult } });
      install(client);

      await executeQuery(findUser, makeAsyncData<UserData>(), opts({
        variables: { id: "1" },
        skipSsrCache: true,
      }));

      expect(client.executed).toHaveLength(1);
    });

    it("writes nothing when the app turned the cache off", async () => {
      resetNuxtAppStub({ gql: { url: "u", ssrCache: false } });
      setRenderSide("server");
      install(makeFakeClient({ result: { data: userResult } }));

      await executeQuery(findUser, makeAsyncData<UserData>(), opts({ variables: { id: "1" } }));

      expect(Object.keys(nuxtPayloadData())).toHaveLength(0);
    });

    it("ignores the payload on the client once hydration is over", async () => {
      const key = makeGraphqlDocumentOperationKey(findUser, { id: "1" });
      nuxtPayloadData()[key] = userResult;
      setHydrating(false);

      const client = makeFakeClient({ result: { data: userResult } });
      install(client);

      await executeQuery(findUser, makeAsyncData<UserData>(), opts({ variables: { id: "1" } }));

      expect(client.executed).toHaveLength(1);
    });
  });

  describe("not executing", () => {
    it("returns immediately when the signal is already aborted", async () => {
      const client = makeFakeClient({ result: { data: userResult } });
      install(client);
      const controller = new AbortController();
      controller.abort();

      const asyncData = makeAsyncData<UserData>();
      await executeQuery(findUser, asyncData, opts({
        variables: { id: "1" },
        signal: controller.signal,
      }));

      expect(client.executed).toHaveLength(0);
      expect(asyncData.pending.value).toBe(false);
    });

    it("returns immediately for immediate: false", async () => {
      const client = makeFakeClient({ result: { data: userResult } });
      install(client);

      const asyncData = makeAsyncData<UserData>();
      await executeQuery(findUser, asyncData, opts({ variables: { id: "1" }, immediate: false }));

      expect(client.executed).toHaveLength(0);
      expect(asyncData.pending.value).toBe(false);
    });
  });

  describe("lazy", () => {
    it("resolves before the request lands, leaving it in flight", async () => {
      install(makeFakeClient({ pendingForever: true }));
      const asyncData = makeAsyncData<UserData>();

      await executeQuery(findUser, asyncData, opts({ variables: { id: "1" }, lazy: true }));

      expect(asyncData.data.value).toBeUndefined();
      expect(asyncData.pending.value).toBe(true);
    });

    it("is ignored on the server, where resolving early would render without data", async () => {
      setRenderSide("server");
      install(makeFakeClient({ result: { data: userResult } }));
      const asyncData = makeAsyncData<UserData>();

      await executeQuery(findUser, asyncData, opts({ variables: { id: "1" }, lazy: true }));

      expect(asyncData.data.value).toEqual(userResult);
    });
  });

  describe("aborting in flight", () => {
    it("stops pending and resolves when the signal fires", async () => {
      install(makeFakeClient({ pendingForever: true }));
      const controller = new AbortController();
      const asyncData = makeAsyncData<UserData>();

      const pending = executeQuery(findUser, asyncData, opts({
        variables: { id: "1" },
        signal: controller.signal,
      }));

      expect(asyncData.pending.value).toBe(true);
      controller.abort();

      await expect(pending).resolves.toBeUndefined();
      expect(asyncData.pending.value).toBe(false);
    });
  });
});
