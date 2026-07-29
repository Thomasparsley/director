import { beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { parse } from "graphql";
import type { TadaDocumentNode } from "gql.tada";

import { provideToNuxtApp, resetNuxtAppStub } from "#layers/director-gql/test/nuxtApp";
import { makeFakeClient } from "#layers/director-gql/test/fakeClient";
import type { FakeClient } from "#layers/director-gql/test/fakeClient";

import { useQuery, useQueryAsync } from "./query";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = TadaDocumentNode<any, any>;

const findUser = parse("query FindUser($id: ID!) { user(id: $id) { id name } }") as AnyNode;

const userResult = { user: { id: "1", name: "Ada" } };

function install(client: FakeClient) {
  provideToNuxtApp({
    $gqlClient: client,
    $gqlBaseFetchOptions: () => ({ credentials: "include" }),
    $gqlQueryPromiseCache: new Map(),
  });
}

/** The signal each executed operation actually went out with. */
function signalsOf(client: FakeClient): (AbortSignal | undefined)[] {
  return client.contexts.map(context =>
    (context as { fetchOptions?: { signal?: AbortSignal } } | undefined)?.fetchOptions?.signal,
  );
}

describe("useQuery", () => {
  beforeEach(() => {
    resetNuxtAppStub({ gql: { url: "https://api.test/graphql" } });
  });

  it("prepares the state without running anything", () => {
    const client = makeFakeClient({ result: { data: userResult } });
    install(client);

    const query = useQuery(findUser as never);

    expect(client.executed).toHaveLength(0);
    expect(query.data.value).toBeUndefined();
    expect(query.pending.value).toBe(false);
  });

  it("runs when refresh() is called", async () => {
    const client = makeFakeClient({ result: { data: userResult } });
    install(client);

    const query = useQuery(findUser as never);
    await query.refresh({ variables: { id: "1" } } as never);

    expect(client.executed).toHaveLength(1);
    expect(query.data.value).toEqual(userResult);
  });

  // Upstream created a fresh AbortController in refresh() but never put its signal on the
  // request, so aborting it cancelled nothing and each refresh raced the last.
  it("sends refresh's own abort signal WITH the request", async () => {
    const client = makeFakeClient({ result: { data: userResult } });
    install(client);

    const query = useQuery(findUser as never);
    await query.refresh({ variables: { id: "1" } } as never);

    const [signal] = signalsOf(client);
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal!.aborted).toBe(false);
  });

  it("aborts the previous request when refreshed again", async () => {
    const client = makeFakeClient({ pendingForever: true });
    install(client);

    const query = useQuery(findUser as never);
    void query.refresh({ variables: { id: "1" } } as never);
    const [first] = signalsOf(client);

    void query.refresh({ variables: { id: "2" } } as never);

    expect(first!.aborted).toBe(true);
    expect(signalsOf(client)[1]!.aborted).toBe(false);
  });

  it("fills a caller-supplied passthrough rather than its own state", async () => {
    install(makeFakeClient({ result: { data: userResult } }));

    const passthrough = {
      data: ref(undefined),
      error: ref(undefined),
      pending: ref(false),
    };

    const query = useQuery(findUser as never, undefined, passthrough as never);
    await query.refresh({ variables: { id: "1" } } as never);

    expect(passthrough.data.value).toEqual(userResult);
  });
});

describe("useQueryAsync", () => {
  beforeEach(() => {
    resetNuxtAppStub({ gql: { url: "https://api.test/graphql" } });
  });

  it("runs and resolves with the settled state", async () => {
    install(makeFakeClient({ result: { data: userResult } }));

    const query = await useQueryAsync(findUser as never, { variables: { id: "1" } } as never);

    expect(query.data.value).toEqual(userResult);
    expect(query.pending.value).toBe(false);
  });

  it("does not run when told not to", async () => {
    const client = makeFakeClient({ result: { data: userResult } });
    install(client);

    await useQueryAsync(findUser as never, { immediate: false } as never);

    expect(client.executed).toHaveLength(0);
  });

  it("carries an abort signal by default", async () => {
    const client = makeFakeClient({ result: { data: userResult } });
    install(client);

    await useQueryAsync(findUser as never, { variables: { id: "1" } } as never);

    expect(signalsOf(client)[0]).toBeInstanceOf(AbortSignal);
  });

  it("prefers the caller's own signal", async () => {
    const client = makeFakeClient({ result: { data: userResult } });
    install(client);
    const controller = new AbortController();

    await useQueryAsync(findUser as never, {
      variables: { id: "1" },
      signal: controller.signal,
    } as never);

    expect(signalsOf(client)[0]).toBe(controller.signal);
  });

  // A component that unmounts mid-flight has nowhere to put the response, and holding
  // the request open only delays whatever comes next.
  it("aborts the in-flight request when its scope is disposed", async () => {
    const client = makeFakeClient({ pendingForever: true });
    install(client);

    const scope = effectScope();
    scope.run(() => {
      void useQueryAsync(findUser as never, { variables: { id: "1" }, lazy: true } as never);
    });

    const [signal] = signalsOf(client);
    expect(signal!.aborted).toBe(false);

    scope.stop();
    expect(signal!.aborted).toBe(true);
  });

  it("refetches when reactive variables change, after the debounce", async () => {
    vi.useFakeTimers();
    try {
      resetNuxtAppStub({
        gql: { url: "u", variablesDebounce: { debounce: 10, maxWait: 20 } },
      });
      const client = makeFakeClient({ result: { data: userResult } });
      install(client);

      const variables = ref({ id: "1" });
      await useQueryAsync(findUser as never, { variables } as never);
      expect(client.executed).toHaveLength(1);

      variables.value = { id: "2" };
      await nextTick();

      // Still debouncing.
      expect(client.executed).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(50);
      expect(client.executed).toHaveLength(2);
    }
    finally {
      vi.useRealTimers();
    }
  });
});
