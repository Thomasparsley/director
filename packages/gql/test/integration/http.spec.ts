import { beforeEach, describe, expect, it, vi } from "vitest";
import { setup } from "@nuxt/test-utils/e2e";
import type { ResultOf } from "gql.tada";

import { useMutationAsync } from "#layers/director-gql/app/composables/mutation";
import { useQueryAsync } from "#layers/director-gql/app/composables/query";
import { GqlResponseError } from "#layers/director-gql/app/errors/responseError";
import { handleMutationResult } from "#layers/director-gql/app/utils/handleMutationResult";
import { executeSharedQuery } from "#layers/director-gql/app/utils/operations";
import { makeQueryDataPassthrough } from "#layers/director-gql/app/utils/query";

import { bootGqlLayer } from "./bootLayer";
import {
  addBookMutation,
  allBooksQuery,
  boomQuery,
  booksQuery,
  persistedAddBookMutation,
  persistedBooksQuery,
  persistedViewerQuery,
  transportQuery,
  unknownPersistedQuery,
  viewerQuery,
} from "./documents";
import type { AddBookPayload } from "./documents";
import { fixtureDir } from "./fixture";

await setup({ rootDir: fixtureDir, server: true, build: true, browser: false });

/**
 * Every assertion below crosses a real socket: the layer's own plugin builds a real urql
 * client, its exchanges serialize a real request, Node's fetch sends it, and a real
 * `graphql` execution answers. The only stand-in is the Nuxt app object holding the
 * plugin's provides.
 *
 * The specs drive the *public* composables rather than the executors underneath them,
 * because that is the surface a consumer actually has.
 */

/** Unique per run, so a re-run against a warm server is not a duplicate. */
let counter = 0;
const uniqueTitle = () => `Integration Book ${process.pid}-${Date.now()}-${counter++}`;

describe("queries over HTTP", () => {
  beforeEach(() => {
    bootGqlLayer();
  });

  it("fetches real data from the real server", async () => {
    const result = await useQueryAsync(allBooksQuery);

    expect(result.error.value).toBeUndefined();
    expect(result.data.value?.books.map(book => book.title)).toContain("Refactoring");
    expect(result.pending.value).toBe(false);
  });

  it("sends variables the server actually filters on", async () => {
    const result = await useQueryAsync(booksQuery, { variables: { search: "Fowler" } });

    expect(result.data.value?.books).toHaveLength(1);
    expect(result.data.value?.books[0]!.title).toBe("Refactoring");
  });

  it("refetches with new variables when asked", async () => {
    const result = await useQueryAsync(booksQuery, { variables: { search: "Fowler" } });
    expect(result.data.value?.books).toHaveLength(1);

    await result.refresh({ variables: { search: "Brooks" } });

    expect(result.data.value?.books.map(book => book.title))
      .toEqual(["The Mythical Man-Month"]);
  });

  // urql v6 would default to GET ("within-url-limit"); the layer pins POST because
  // plenty of servers only route it. The fixture echoes the method back.
  it("goes out as POST by default", async () => {
    const result = await useQueryAsync(transportQuery);

    expect(result.data.value?.transport).toBe("POST");
  });

  it("goes out as GET when the app opts in", async () => {
    bootGqlLayer({ preferGetMethod: "force" });

    const result = await useQueryAsync(transportQuery);

    expect(result.data.value?.transport).toBe("GET");
  });

  it("applies a transform to what the server returned", async () => {
    const result = await useQueryAsync(allBooksQuery, {
      transform: data => data.books.length,
    });

    expect(result.data.value).toBeGreaterThan(0);
  });

  it("does not run when told not to", async () => {
    const result = await useQueryAsync(allBooksQuery, { immediate: false });

    expect(result.data.value).toBeUndefined();

    await result.refresh();

    expect(result.data.value?.books.length).toBeGreaterThan(0);
  });
});

describe("failures over HTTP", () => {
  beforeEach(() => {
    bootGqlLayer();
  });

  it("surfaces a resolver that throws as a GraphQL error", async () => {
    const onError = vi.fn();

    const result = await useQueryAsync(boomQuery, { onError });

    expect(result.error.value?.graphQLErrors.map(error => error.message))
      .toContain("The server refused to answer.");
    expect(onError).toHaveBeenCalledOnce();
  });

  it("surfaces an unreachable endpoint as a network error", async () => {
    // Port 1 is privileged and unbound: a real connection refusal, not a 404 page.
    bootGqlLayer({ url: "http://127.0.0.1:1/graphql" });

    const result = await useQueryAsync(allBooksQuery);

    expect(result.error.value?.networkError).toBeDefined();
    expect(result.data.value).toBeUndefined();
    expect(result.pending.value).toBe(false);
  });

  it("resolves rather than rejecting, so a template can render the error", async () => {
    bootGqlLayer({ url: "http://127.0.0.1:1/graphql" });

    await expect(useQueryAsync(allBooksQuery)).resolves.toBeDefined();
  });
});

describe("mutations over HTTP", () => {
  beforeEach(() => {
    bootGqlLayer();
  });

  it("round-trips and the change is visible to the next query", async () => {
    const title = uniqueTitle();

    const added = await useMutationAsync(addBookMutation, {
      variables: { title, author: "Nobody" },
    });

    expect(added.error.value).toBeUndefined();
    expect(added.data.value?.addBook.book?.title).toBe(title);

    const listed = await useQueryAsync(booksQuery, { variables: { search: title } });

    expect(listed.data.value?.books.map(book => book.title)).toEqual([title]);
  });

  it("hands a successful payload back through handleMutationResult", async () => {
    const title = uniqueTitle();

    const response = await useMutationAsync(addBookMutation, {
      variables: { title, author: "Nobody" },
      // The payload — not the whole result — is what carries `errors`.
      transform: (data): AddBookPayload => data.addBook,
    });

    const result = handleMutationResult({ response });

    expect(result.book.title).toBe(title);
  });

  it("routes a payload-level error to its typed handler", async () => {
    // Seeded by the fixture, so adding it again is always a duplicate.
    const onDuplicateTitle = vi.fn();

    const response = await useMutationAsync(addBookMutation, {
      variables: { title: "Refactoring", author: "Fowler" },
      transform: (data): AddBookPayload => data.addBook,
    });

    expect(() => handleMutationResult({
      response,
      onError: { onDuplicateTitle, onTitleRequired: vi.fn() },
    })).toThrow(GqlResponseError);

    expect(onDuplicateTitle).toHaveBeenCalledOnce();
    expect(onDuplicateTitle.mock.calls[0]![0]).toMatchObject({ code: "DuplicateTitle" });
  });
});

// Exactly the shape the README documents: one shared state object, filled once however
// many callers ask for it at the same moment.
describe("shared queries over HTTP", () => {
  beforeEach(() => {
    bootGqlLayer();
  });

  it("collapses concurrent callers onto a single request", async () => {
    const books = makeQueryDataPassthrough<ResultOf<typeof allBooksQuery>>();
    const run = () => executeSharedQuery(
      books,
      () => useQueryAsync(allBooksQuery, undefined, books),
      { cacheKey: "books" },
    );

    await Promise.all([run(), run(), run()]);

    expect(books.error.value).toBeUndefined();
    expect(books.data.value?.books.map(book => book.title)).toContain("Refactoring");
    expect(books.pending.value).toBe(false);
  });

  it("does nothing on a later call, because the data is already there", async () => {
    const books = makeQueryDataPassthrough<ResultOf<typeof allBooksQuery>>();
    const run = () => executeSharedQuery(
      books,
      () => useQueryAsync(allBooksQuery, undefined, books),
      { cacheKey: "books" },
    );

    await run();
    const before = books.data.value;

    await run();

    expect(books.data.value).toBe(before);
  });
});

describe("SSR header forwarding", () => {
  // The server has no cookie jar of its own. Without forwarding, an SSR query runs
  // unauthenticated and the first paint disagrees with the client's — so the fixture
  // echoes the session cookie back through a resolver.
  it("carries the incoming request's cookie to the GraphQL server", async () => {
    bootGqlLayer({}, { side: "server", requestHeaders: { cookie: "session=abc123" } });

    const result = await useQueryAsync(viewerQuery);

    expect(result.data.value?.viewer).toBe("abc123");
  });

  it("forwards nothing when the app opted out", async () => {
    bootGqlLayer(
      { ssrForwardHeaders: [] },
      { side: "server", requestHeaders: { cookie: "session=abc123" } },
    );

    const result = await useQueryAsync(viewerQuery);

    expect(result.data.value?.viewer).toBeNull();
  });

  it("sends no cookie on the client, where the browser owns the jar", async () => {
    bootGqlLayer({}, { side: "client", requestHeaders: { cookie: "session=abc123" } });

    const result = await useQueryAsync(viewerQuery);

    expect(result.data.value?.viewer).toBeNull();
  });
});

describe("persisted documents", () => {
  beforeEach(() => {
    bootGqlLayer({ operations: "persisted" });
  });

  // The client sends only `{ id, variables }`. That the server can answer at all proves
  // the query text never went over the wire.
  it("answers a query the client never sent the text for", async () => {
    const result = await useQueryAsync(persistedBooksQuery, { variables: { search: "Brooks" } });

    expect(result.error.value).toBeUndefined();
    expect(result.data.value?.books.map(book => book.title)).toEqual(["The Mythical Man-Month"]);
  });

  it("runs a persisted mutation", async () => {
    const title = uniqueTitle();

    const response = await useMutationAsync(persistedAddBookMutation, {
      variables: { title, author: "Nobody" },
    });

    expect(response.error.value).toBeUndefined();
    expect(response.data.value?.addBook.book?.title).toBe(title);
  });

  it("still forwards SSR cookies", async () => {
    bootGqlLayer(
      { operations: "persisted" },
      { side: "server", requestHeaders: { cookie: "session=persisted" } },
    );

    const result = await useQueryAsync(persistedViewerQuery);

    expect(result.data.value?.viewer).toBe("persisted");
  });

  it("surfaces an id the server does not know as an error, not silence", async () => {
    const result = await useQueryAsync(unknownPersistedQuery);

    expect(result.error.value).toBeDefined();
    expect(result.data.value).toBeUndefined();
  });
});
