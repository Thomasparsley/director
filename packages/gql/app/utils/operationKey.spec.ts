import { describe, expect, it } from "vitest";
import { parse } from "graphql";
import type { TadaDocumentNode } from "gql.tada";

import { makeGraphqlDocumentOperationKey } from "./operationKey";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const document = (source: string) => parse(source) as any as TadaDocumentNode<any, any>;

const findUser = document("query FindUser($id: ID!) { user(id: $id) { id name } }");
const listUsers = document("query ListUsers { users { id } }");

/** What `gql.tada generate persisted` leaves behind: an id, and no AST to print. */
const persisted = (documentId: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ documentId, definitions: [], kind: "Document" }) as any as TadaDocumentNode<any, any>;

describe("makeGraphqlDocumentOperationKey", () => {
  it("returns the caller's explicit key untouched", () => {
    expect(makeGraphqlDocumentOperationKey(findUser, { id: "1" }, "my-key")).toBe("my-key");
  });

  it("prefers the explicit key over both the document and the variables", () => {
    const a = makeGraphqlDocumentOperationKey(findUser, { id: "1" }, "same");
    const b = makeGraphqlDocumentOperationKey(listUsers, { id: "2" }, "same");

    expect(a).toBe(b);
  });

  it("is stable for the same document and variables", () => {
    const a = makeGraphqlDocumentOperationKey(findUser, { id: "1" });
    const b = makeGraphqlDocumentOperationKey(findUser, { id: "1" });

    expect(a).toBe(b);
  });

  it("separates the same document under different variables", () => {
    const a = makeGraphqlDocumentOperationKey(findUser, { id: "1" });
    const b = makeGraphqlDocumentOperationKey(findUser, { id: "2" });

    expect(a).not.toBe(b);
  });

  it("separates different documents", () => {
    const a = makeGraphqlDocumentOperationKey(findUser);
    const b = makeGraphqlDocumentOperationKey(listUsers);

    expect(a).not.toBe(b);
  });

  it("keys a persisted document by its documentId, which has no AST to print", () => {
    const a = makeGraphqlDocumentOperationKey(persisted("abc123"), { id: "1" });
    const b = makeGraphqlDocumentOperationKey(persisted("abc123"), { id: "1" });
    const c = makeGraphqlDocumentOperationKey(persisted("def456"), { id: "1" });

    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("separates a persisted document under different variables", () => {
    const a = makeGraphqlDocumentOperationKey(persisted("abc123"), { id: "1" });
    const b = makeGraphqlDocumentOperationKey(persisted("abc123"), { id: "2" });

    expect(a).not.toBe(b);
  });
});
