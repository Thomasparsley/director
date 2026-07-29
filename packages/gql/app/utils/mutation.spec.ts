import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { parse } from "graphql";
import { CombinedError } from "@urql/core";
import type { TadaDocumentNode } from "gql.tada";

import { provideToNuxtApp, resetNuxtAppStub } from "#layers/director-gql/test/nuxtApp";
import { makeFakeClient } from "#layers/director-gql/test/fakeClient";
import type { FakeClient } from "#layers/director-gql/test/fakeClient";

import type { MutationOptions, MutationResponse } from "../types/mutation";

import { executeMutation } from "./mutation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = TadaDocumentNode<any, any>;

const createUser = parse(
  "mutation CreateUser($name: String!) { createUser(name: $name) { id } }",
) as AnyNode;

interface CreatePayload {
  createUser: { id: string }
}

const payload: CreatePayload = { createUser: { id: "1" } };

function makeAsyncData<Data>(): MutationResponse<Data> {
  return {
    data: ref(undefined) as MutationResponse<Data>["data"],
    error: ref(undefined),
    pending: ref(false),
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
const opts = <T>(value: T) => value as any as MutationOptions<AnyNode, any>;

describe("executeMutation", () => {
  beforeEach(() => {
    resetNuxtAppStub({ gql: { url: "https://api.test/graphql" } });
  });

  describe("on success", () => {
    it("writes the data and clears pending", async () => {
      install(makeFakeClient({ result: { data: payload } }));
      const asyncData = makeAsyncData<CreatePayload>();

      await executeMutation(createUser, asyncData, opts({ variables: { name: "Ada" } }));

      expect(asyncData.data.value).toEqual(payload);
      expect(asyncData.error.value).toBeUndefined();
      expect(asyncData.pending.value).toBe(false);
    });

    it("applies the transform", async () => {
      install(makeFakeClient({ result: { data: payload } }));
      const asyncData = makeAsyncData<string>();

      await executeMutation(createUser, asyncData, opts({
        variables: { name: "Ada" },
        transform: (data: CreatePayload) => data.createUser.id,
      }));

      expect(asyncData.data.value).toBe("1");
    });

    it("names the operation kind for a plain document", async () => {
      const client = makeFakeClient({ result: { data: payload } });
      install(client);

      await executeMutation(createUser, makeAsyncData(), opts({ variables: { name: "Ada" } }));

      expect((client.executed[0] as { kind: string }).kind).toBe("mutation");
    });

    it("sends the base fetch options as the operation context", async () => {
      const client = makeFakeClient({ result: { data: payload } });
      install(client, { credentials: "include", headers: { cookie: "sid=1" } });

      await executeMutation(createUser, makeAsyncData(), opts({ variables: { name: "Ada" } }));

      expect(client.contexts[0]).toEqual({
        fetchOptions: { credentials: "include", headers: { cookie: "sid=1" } },
      });
    });
  });

  describe("on a result carrying an error", () => {
    it("surfaces it and calls onError", async () => {
      const error = new CombinedError({ graphQLErrors: ["boom"] });
      install(makeFakeClient({ result: { error } }));
      const onError = vi.fn();
      const asyncData = makeAsyncData<CreatePayload>();

      await executeMutation(createUser, asyncData, opts({
        variables: { name: "Ada" },
        onError,
      }));

      expect(asyncData.error.value).toBe(error);
      expect(asyncData.pending.value).toBe(false);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  // Upstream logged the rejection and returned, leaving `error` unset — so the caller saw
  // "no data and no error" and reported a generic failure with the cause gone.
  describe("on a rejection", () => {
    it("records the cause as an error instead of swallowing it", async () => {
      install(makeFakeClient({ rejectWith: new Error("socket hang up") }));
      const onError = vi.fn();
      const asyncData = makeAsyncData<CreatePayload>();

      await executeMutation(createUser, asyncData, opts({
        variables: { name: "Ada" },
        onError,
      }));

      expect(asyncData.error.value).toBeInstanceOf(CombinedError);
      expect(asyncData.error.value?.networkError?.message).toBe("socket hang up");
      expect(asyncData.pending.value).toBe(false);
      expect(onError).toHaveBeenCalledOnce();
    });

    it("passes a CombinedError straight through rather than wrapping it twice", async () => {
      const error = new CombinedError({ networkError: new Error("offline") });
      install(makeFakeClient({ rejectWith: error }));
      const asyncData = makeAsyncData<CreatePayload>();

      await executeMutation(createUser, asyncData, opts({ variables: { name: "Ada" } }));

      expect(asyncData.error.value).toBe(error);
    });

    it("wraps a non-Error rejection so the caller still gets a CombinedError", async () => {
      install(makeFakeClient({ rejectWith: "just a string" }));
      const asyncData = makeAsyncData<CreatePayload>();

      await executeMutation(createUser, asyncData, opts({ variables: { name: "Ada" } }));

      expect(asyncData.error.value).toBeInstanceOf(CombinedError);
      expect(asyncData.error.value?.networkError?.message).toBe("just a string");
    });

    it("still resolves — the caller reads the outcome off the state", async () => {
      install(makeFakeClient({ rejectWith: new Error("nope") }));

      await expect(
        executeMutation(createUser, makeAsyncData(), opts({ variables: { name: "Ada" } })),
      ).resolves.toBeUndefined();
    });
  });

  describe("on an empty response", () => {
    it("leaves data and error alone", async () => {
      install(makeFakeClient({ result: { data: undefined } }));
      const asyncData = makeAsyncData<CreatePayload>();

      await executeMutation(createUser, asyncData, opts({ variables: { name: "Ada" } }));

      expect(asyncData.data.value).toBeUndefined();
      expect(asyncData.error.value).toBeUndefined();
      expect(asyncData.pending.value).toBe(false);
    });
  });
});
