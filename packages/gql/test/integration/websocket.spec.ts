import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { effectScope, ref } from "vue";
import { $fetch, setup, url } from "@nuxt/test-utils/e2e";
import WebSocket from "ws";

import { useSubscriptionAsync } from "#layers/director-gql/app/composables/subscribe";
import { makeGraphqlWsForwarder } from "#layers/director-gql/transports/graphqlWs";
import { executeMutation } from "#layers/director-gql/app/utils/mutation";
import type { MutationResponse } from "#layers/director-gql/app/types/mutation";
import type { Subscription } from "#layers/director-gql/app/types/subscribe";

import { bootGqlLayer } from "./bootLayer";
import { addBookMutation, bookAddedSubscription, persistedAddBookMutation } from "./documents";
import type { Book } from "./documents";
import { fixtureDir } from "./fixture";

await setup({ rootDir: fixtureDir, server: true, build: true, browser: false });

/**
 * Subscriptions over a real WebSocket: Nitro's crossws server running graphql-ws, and the
 * layer's own forwarder on the other end. A mutation sent over HTTP is what the socket
 * subscriber hears — one server process, two transports.
 *
 * The client is booted once per suite, as a real app would have it: one client, one
 * socket, many subscriptions. Booting per test would strand the previous socket with its
 * server-side subscription still open, and the counts below would drift.
 */
function bootWithSocket(options: { persisted?: boolean } = {}) {
  return bootGqlLayer({
    ...(options.persisted ? { operations: "persisted" as const } : {}),
    forwardSubscription: () => makeGraphqlWsForwarder({
      // Node only grew a global WebSocket in 22, and this package supports 20.
      url: url("/graphql-ws").replace(/^http/, "ws"),
      webSocketImpl: WebSocket,
      retryAttempts: 0,
    }),
  });
}

/** How many `bookAdded` generators the server currently holds open. */
async function subscriberCount(): Promise<number> {
  const { count } = await $fetch<{ count: number }>("/api/subscribers");
  return count;
}

async function waitFor(condition: () => Promise<boolean>, what: string | (() => string)): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${typeof what === "function" ? what() : what}`);
}

let lastSeen = -1;
const whenSubscribers = (n: number) =>
  waitFor(async () => {
    lastSeen = await subscriberCount();
    return lastSeen === n;
  }, () => `${n} server-side subscriber(s); last saw ${lastSeen}`);

/** Collects what a subscription delivers, and waits until `n` values have landed. */
function collect(subscribe: (onValue: (book: Book) => void) => Subscription) {
  const received: Book[] = [];
  let notify: (() => void) | undefined;

  const subscription = subscribe((book) => {
    received.push(book);
    notify?.();
  });

  return {
    received,
    subscription,
    async take(n: number): Promise<Book[]> {
      const deadline = Date.now() + 10_000;
      while (received.length < n && Date.now() < deadline) {
        await Promise.race([
          new Promise<void>((resolve) => {
            notify = resolve;
          }),
          new Promise(resolve => setTimeout(resolve, 100)),
        ]);
      }
      if (received.length < n) {
        throw new Error(`Only received ${received.length} of ${n} expected values`);
      }
      return received;
    },
  };
}

let counter = 0;
const uniqueTitle = () => `Socket Book ${process.pid}-${Date.now()}-${counter++}`;

/** Publishes an event the hard way: a real mutation over HTTP. */
async function addBook(title: string, persisted = false): Promise<void> {
  const response: MutationResponse<unknown> = {
    data: ref(undefined),
    error: ref(undefined),
    pending: ref(false),
  };

  await executeMutation(persisted ? persistedAddBookMutation : addBookMutation, response, {
    variables: { title, author: "Nobody" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  if (response.error.value) {
    throw response.error.value;
  }
}

const subscribeToBooks = (onValue: (book: Book) => void) =>
  useSubscriptionAsync(bookAddedSubscription).subscribe(({ data }) => onValue(data.bookAdded));

describe("subscriptions over a real WebSocket", () => {
  const open: Subscription[] = [];

  beforeEach(() => {
    bootWithSocket();
  });

  afterEach(async () => {
    for (const subscription of open.splice(0)) {
      subscription.unsubscribe();
    }
    await whenSubscribers(0);
  });

  it("delivers an event published by an HTTP mutation", async () => {
    const collector = collect(subscribeToBooks);
    open.push(collector.subscription);

    // The socket has to be up and the operation registered, or the event fires into a void.
    await whenSubscribers(1);

    const title = uniqueTitle();
    await addBook(title);

    const [book] = await collector.take(1);
    expect(book!.title).toBe(title);
    expect(book!.author).toBe("Nobody");
  });

  it("keeps delivering — a subscription is a stream, not one answer", async () => {
    const collector = collect(subscribeToBooks);
    open.push(collector.subscription);
    await whenSubscribers(1);

    const first = uniqueTitle();
    const second = uniqueTitle();
    await addBook(first);
    await addBook(second);

    expect((await collector.take(2)).map(b => b.title)).toEqual([first, second]);
  });

  // urql keys operations by document + variables, so two consumers of the same
  // subscription share one operation — and therefore one socket subscription. The
  // server-side count staying at 1 is what proves the sharing is real and not just
  // client-side fan-out of two separate streams.
  it("shares one server-side subscription between identical consumers", async () => {
    const a = collect(subscribeToBooks);
    const b = collect(subscribeToBooks);
    open.push(a.subscription, b.subscription);

    await whenSubscribers(1);

    const title = uniqueTitle();
    await addBook(title);

    expect((await a.take(1))[0]!.title).toBe(title);
    expect((await b.take(1))[0]!.title).toBe(title);
    expect(await subscriberCount()).toBe(1);
  });

  // Only the server can prove this: a client that stops listening but leaves the
  // generator open would leak one per disconnect.
  it("releases the server's generator when the client unsubscribes", async () => {
    const subscription = subscribeToBooks(() => {});
    await whenSubscribers(1);

    subscription.unsubscribe();

    await whenSubscribers(0);
  });

  // The client-side unit spec proves `unsubscribe` is called; only the server can prove
  // the subscription was actually released at the far end.
  it("releases the server's generator when the subscribing scope is disposed", async () => {
    const scope = effectScope();
    scope.run(() => {
      subscribeToBooks(() => {});
    });

    await whenSubscribers(1);

    scope.stop();

    await whenSubscribers(0);
  });

  it("stops delivering after unsubscribe", async () => {
    const collector = collect(subscribeToBooks);
    await whenSubscribers(1);

    collector.subscription.unsubscribe();
    await whenSubscribers(0);

    await addBook(uniqueTitle());
    await new Promise(resolve => setTimeout(resolve, 300));

    expect(collector.received).toHaveLength(0);
  });

  // The client sends `{ id, variables }` with an empty query; the server resolves the
  // document from its manifest. That an event arrives at all proves the query text never
  // crossed the socket.
  it("delivers events for a persisted document whose text was never sent", async () => {
    bootWithSocket({ persisted: true });

    const persistedBookAdded = {
      documentId: "persisted-book-added",
      kind: "Document",
      definitions: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const collector = collect(onValue =>
      useSubscriptionAsync(persistedBookAdded)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .subscribe(({ data }: any) => onValue(data.bookAdded)),
    );
    open.push(collector.subscription);

    await whenSubscribers(1);

    const title = uniqueTitle();
    await addBook(title, true);

    expect((await collector.take(1))[0]!.title).toBe(title);
  });
});
