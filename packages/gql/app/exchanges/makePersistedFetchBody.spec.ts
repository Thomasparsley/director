import { describe, expect, it } from "vitest";

import { makePersistedFetchBody } from "./makePersistedFetchBody";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const request = (query: unknown, variables?: unknown) => ({ query, variables }) as any;

describe("makePersistedFetchBody", () => {
  it("sends the documentId and the variables — never the query text", () => {
    const body = makePersistedFetchBody(
      request({ documentId: "abc123", definitions: [] }, { id: "1" }),
    );

    expect(body).toEqual({ id: "abc123", variables: { id: "1" } });
    expect(body).not.toHaveProperty("query");
  });

  it("omits variables entirely when there are none", () => {
    const body = makePersistedFetchBody(request({ documentId: "abc123" }, null));

    expect(body).toEqual({ id: "abc123", variables: undefined });
  });

  it("carries an undefined id through for a document that was never persisted, so the "
    + "server's rejection names the real problem", () => {
    const body = makePersistedFetchBody(request({ definitions: [] }, { id: "1" }));

    expect(body).toEqual({ id: undefined, variables: { id: "1" } });
  });
});
