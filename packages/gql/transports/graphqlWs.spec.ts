import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Operation } from "@urql/core";
import type { FetchBody } from "@urql/core/internal";

const subscribe = vi.fn((_payload: unknown, _sink: unknown) => () => {});
const createClient = vi.fn((_options: unknown) => ({ subscribe }));

vi.mock("graphql-ws", () => ({ createClient: (options: unknown) => createClient(options) }));

const { makeGraphqlWsForwarder } = await import("./graphqlWs");

const sink = { next: () => {}, error: () => {}, complete: () => {} };

/** Runs a request through the forwarder the way urql's subscription exchange does. */
function forward(
  forwarder: ReturnType<typeof makeGraphqlWsForwarder>,
  body: Record<string, unknown>,
) {
  return forwarder(body as unknown as FetchBody, {} as Operation);
}

describe("makeGraphqlWsForwarder", () => {
  beforeEach(() => {
    createClient.mockClear();
    subscribe.mockClear();
  });

  it("connects lazily, so a page that never subscribes never opens a socket", () => {
    makeGraphqlWsForwarder({ url: "ws://api.test/graphql" });

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ url: "ws://api.test/graphql", lazy: true }),
    );
  });

  it("lets the caller override the defaults", () => {
    makeGraphqlWsForwarder({ url: "ws://api.test/graphql", lazy: false, retryAttempts: 9 });

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ lazy: false, retryAttempts: 9 }),
    );
  });

  it("opens nothing until a subscription actually runs", () => {
    const forwarder = makeGraphqlWsForwarder({ url: "ws://api.test/graphql" });

    expect(subscribe).not.toHaveBeenCalled();

    forward(forwarder, { query: "subscription { ping }" }).subscribe(sink);

    expect(subscribe).toHaveBeenCalledOnce();
  });

  it("sends a plain document's query text through", () => {
    const forwarder = makeGraphqlWsForwarder({ url: "ws://api.test/graphql" });

    forward(forwarder, { query: "subscription { ping }", variables: { a: 1 } }).subscribe(sink);

    expect(subscribe.mock.calls[0]![0]).toEqual({
      query: "subscription { ping }",
      variables: { a: 1 },
    });
  });

  // A persisted operation has no query text — the body is `{ id, variables }` — but
  // graphql-ws types `query` as required, so it goes over empty and the server resolves
  // the operation from the id.
  it("keeps a persisted operation's id and sends an empty query", () => {
    const forwarder = makeGraphqlWsForwarder({ url: "ws://api.test/graphql" });

    forward(forwarder, { id: "abc123", variables: { a: 1 } }).subscribe(sink);

    expect(subscribe.mock.calls[0]![0]).toEqual({
      id: "abc123",
      variables: { a: 1 },
      query: "",
    });
  });

  it("passes the sink straight to graphql-ws", () => {
    const forwarder = makeGraphqlWsForwarder({ url: "ws://api.test/graphql" });

    forward(forwarder, { query: "subscription { ping }" }).subscribe(sink);

    expect(subscribe.mock.calls[0]![1]).toBe(sink);
  });

  it("hands back graphql-ws's own unsubscribe so urql can tear the socket down", () => {
    const dispose = vi.fn();
    subscribe.mockReturnValueOnce(dispose);
    const forwarder = makeGraphqlWsForwarder({ url: "ws://api.test/graphql" });

    forward(forwarder, { query: "subscription { ping }" }).subscribe(sink).unsubscribe();

    expect(dispose).toHaveBeenCalledOnce();
  });

  it("reuses one socket across subscriptions", () => {
    const forwarder = makeGraphqlWsForwarder({ url: "ws://api.test/graphql" });

    forward(forwarder, { query: "subscription { a }" }).subscribe(sink);
    forward(forwarder, { query: "subscription { b }" }).subscribe(sink);

    expect(createClient).toHaveBeenCalledOnce();
    expect(subscribe).toHaveBeenCalledTimes(2);
  });
});
