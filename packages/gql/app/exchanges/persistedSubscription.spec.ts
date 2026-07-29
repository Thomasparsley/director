import { describe, expect, it, vi } from "vitest";
import { Client } from "@urql/core";
import type { Operation } from "@urql/core";
import type { FetchBody } from "@urql/core/internal";
import { Kind, OperationTypeNode } from "graphql";
import { pipe, subscribe } from "wonka";

import { persistedSubscriptionExchange } from "./persistedSubscription";

/**
 * A persisted subscription document as `useSubscriptionAsync` hands it over: the id the
 * server resolves, plus the synthetic operation definition urql needs to route it as a
 * subscription rather than a query.
 */
const persistedSubscription = {
  documentId: "abc123",
  kind: "Document",
  definitions: [
    {
      kind: Kind.OPERATION_DEFINITION,
      operation: OperationTypeNode.SUBSCRIPTION,
      selectionSet: { kind: Kind.SELECTION_SET, selections: [] },
    },
  ],
};

interface Sink {
  next: (value: unknown) => void
  error: (error: unknown) => void
  complete: () => void
}

function makeHarness() {
  const bodies: FetchBody[] = [];
  const operations: Operation[] = [];
  let sink: Sink | undefined;
  const dispose = vi.fn();

  const forwardSubscription = (body: FetchBody, operation: Operation) => {
    bodies.push(body);
    operations.push(operation);
    return {
      subscribe: (observer: Sink) => {
        sink = observer;
        return { unsubscribe: dispose };
      },
    };
  };

  const client = new Client({
    url: "https://api.test/graphql",
    exchanges: [persistedSubscriptionExchange({ forwardSubscription })],
  });

  return {
    bodies,
    operations,
    dispose,
    client,
    emit: (value: unknown) => sink!.next(value),
    /**
     * The exchange defers its `subscribe` by a microtask, so that a teardown arriving in
     * the same tick never opens the socket at all. Nothing reaches the transport before
     * this resolves.
     */
    connected: () => Promise.resolve(),
  };
}

describe("persistedSubscriptionExchange", () => {
  it("hands the transport the documentId, not the query text", () => {
    const harness = makeHarness();

    pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      harness.client.subscription(persistedSubscription as any, { room: "1" }),
      subscribe(() => {}),
    );

    expect(harness.bodies[0]).toEqual({ id: "abc123", variables: { room: "1" } });
    expect(harness.bodies[0]).not.toHaveProperty("query");
  });

  it("delivers results the transport pushes", async () => {
    const harness = makeHarness();
    const results: unknown[] = [];

    pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      harness.client.subscription(persistedSubscription as any, {}),
      subscribe(result => results.push(result.data)),
    );
    await harness.connected();

    harness.emit({ data: { bookAdded: { id: "1" } } });

    expect(results).toEqual([{ bookAdded: { id: "1" } }]);
  });

  it("keeps delivering — a subscription is a stream, not one answer", async () => {
    const harness = makeHarness();
    const results: unknown[] = [];

    pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      harness.client.subscription(persistedSubscription as any, {}),
      subscribe(result => results.push(result.data)),
    );
    await harness.connected();

    harness.emit({ data: { bookAdded: { id: "1" } } });
    harness.emit({ data: { bookAdded: { id: "2" } } });

    expect(results).toHaveLength(2);
  });

  it("closes the transport when the consumer unsubscribes", async () => {
    const harness = makeHarness();

    const subscription = pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      harness.client.subscription(persistedSubscription as any, {}),
      subscribe(() => {}),
    );
    await harness.connected();

    expect(harness.dispose).not.toHaveBeenCalled();

    subscription.unsubscribe();

    expect(harness.dispose).toHaveBeenCalledOnce();
  });

  it("routes the operation as a subscription", () => {
    const harness = makeHarness();

    pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      harness.client.subscription(persistedSubscription as any, {}),
      subscribe(() => {}),
    );

    expect(harness.operations[0]!.kind).toBe("subscription");
  });
});
