import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client, createRequest } from "@urql/core";
import type { TadaDocumentNode } from "gql.tada";
import { pipe, take, toPromise } from "wonka";

import { persistedFetchExchange } from "./persistedFetch";

/** What `gql.tada generate persisted` leaves behind: an id, and no AST to print. */
const persisted = (documentId: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ documentId, kind: "Document", definitions: [] }) as any as TadaDocumentNode<any, any>;

const findBook = persisted("abc123");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const fetchMock = vi.fn(async () => jsonResponse({ data: { book: { id: "1" } } }));

function run(document = findBook, variables: Record<string, unknown> = { id: "1" }) {
  const client = new Client({
    url: "https://api.test/graphql",
    exchanges: [persistedFetchExchange],
    preferGetMethod: false,
  });

  // A persisted document has no AST, so the kind must be `undefined` to match what urql
  // reads off it — the same rule `operationKindFor` encodes.
  const operation = client.createRequestOperation(
    undefined as never,
    createRequest(document, variables),
    { fetchOptions: { credentials: "include" } },
  );

  return pipe(client.executeRequestOperation(operation), take(1), toPromise);
}

describe("persistedFetchExchange", () => {
  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // The whole point of a persisted document: the server already has the query text.
  it("sends the documentId and variables, never the query", async () => {
    await run();

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      id: "abc123",
      variables: { id: "1" },
    });
  });

  it("posts to the configured endpoint", async () => {
    await run();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.test/graphql");
    expect(init.method).toBe("POST");
  });

  it("carries the operation's fetch options onto the request", async () => {
    await run();

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.credentials).toBe("include");
  });

  it("surfaces the server's data", async () => {
    const result = await run();

    expect(result.data).toEqual({ book: { id: "1" } });
    expect(result.error).toBeUndefined();
  });

  it("surfaces GraphQL errors as a CombinedError", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ errors: [{ message: "nope" }] }));

    const result = await run();

    expect(result.error?.graphQLErrors.map(e => e.message)).toEqual(["nope"]);
  });

  it("surfaces a transport failure as a network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("socket hang up"));

    const result = await run();

    expect(result.error?.networkError?.message).toBe("socket hang up");
  });
});
