import { beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";
import { Kind, OperationTypeNode, parse } from "graphql";
import type { TadaDocumentNode } from "gql.tada";

import { provideToNuxtApp, resetNuxtAppStub } from "#layers/director-gql/test/nuxtApp";
import { makeFakeClient } from "#layers/director-gql/test/fakeClient";
import type { FakeClient } from "#layers/director-gql/test/fakeClient";

import { useSubscriptionAsync } from "./subscribe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = TadaDocumentNode<any, any>;

const onUserAdded = parse("subscription OnUserAdded { userAdded { id } }") as AnyNode;

/** What `gql.tada generate persisted` leaves behind: an id, and no AST. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const persisted = { documentId: "abc123", kind: "Document", definitions: [] } as any as AnyNode;

function install(client: FakeClient) {
  provideToNuxtApp({
    $gqlClient: client,
    $gqlBaseFetchOptions: () => ({}),
    $gqlQueryPromiseCache: new Map(),
  });
}

describe("useSubscriptionAsync", () => {
  let client: FakeClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let calls: any[][];

  beforeEach(() => {
    resetNuxtAppStub({ gql: { url: "https://api.test/graphql" } });
    client = makeFakeClient();
    calls = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client.subscription = (...args: any[]) => {
      calls.push(args);
      return { subscribe: () => ({ unsubscribe: () => {} }) };
    };
    install(client);
  });

  it("throws when the app never configured a client", () => {
    resetNuxtAppStub({});
    expect(() => useSubscriptionAsync(onUserAdded as never)).toThrow(/gql\.url/);
  });

  it("passes the document straight to the client", () => {
    useSubscriptionAsync(onUserAdded as never);

    expect(calls[0]![0].definitions).toEqual(onUserAdded.definitions);
  });

  it("unwraps reactive variables", () => {
    useSubscriptionAsync(onUserAdded as never, { variables: ref({ id: "1" }) } as never);

    expect(calls[0]![1]).toEqual({ id: "1" });
  });

  it("passes undefined when there are no variables", () => {
    useSubscriptionAsync(onUserAdded as never);

    expect(calls[0]![1]).toBeUndefined();
  });

  // A persisted document is stripped of its AST, and urql reads the operation kind off
  // the first definition — without a stand-in it would route the subscription as a query.
  it("synthesises a subscription definition for a persisted document", () => {
    useSubscriptionAsync(persisted as never);

    const [document] = calls[0]!;
    expect(document.definitions).toHaveLength(1);
    expect(document.definitions[0]).toMatchObject({
      kind: Kind.OPERATION_DEFINITION,
      operation: OperationTypeNode.SUBSCRIPTION,
    });
  });

  it("keeps the documentId on the synthesised node, since that is what the server resolves", () => {
    useSubscriptionAsync(persisted as never);

    expect(calls[0]![0].documentId).toBe("abc123");
  });

  it("returns something subscribable", () => {
    const observable = useSubscriptionAsync(onUserAdded as never);

    expect(typeof observable.subscribe).toBe("function");
  });

  // A socket subscription is not collected on its own: an unmounted component that never
  // unsubscribed keeps its end — and the server's — open.
  describe("teardown", () => {
    it("closes the subscription when its scope is disposed", () => {
      const unsubscribe = vi.fn();
      client.subscription = () => ({ subscribe: () => ({ unsubscribe }) });
      install(client);

      const scope = effectScope();
      scope.run(() => {
        useSubscriptionAsync(onUserAdded as never).subscribe(() => {});
      });

      expect(unsubscribe).not.toHaveBeenCalled();

      scope.stop();

      expect(unsubscribe).toHaveBeenCalledOnce();
    });

    it("still hands the caller its own unsubscribe", () => {
      const unsubscribe = vi.fn();
      client.subscription = () => ({ subscribe: () => ({ unsubscribe }) });
      install(client);

      useSubscriptionAsync(onUserAdded as never).subscribe(() => {}).unsubscribe();

      expect(unsubscribe).toHaveBeenCalledOnce();
    });

    it("works outside a scope, where there is nothing to dispose", () => {
      const unsubscribe = vi.fn();
      client.subscription = () => ({ subscribe: () => ({ unsubscribe }) });
      install(client);

      expect(() => useSubscriptionAsync(onUserAdded as never).subscribe(() => {})).not.toThrow();
    });
  });
});
