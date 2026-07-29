import { describe, expect, it } from "vitest";
import { parse } from "graphql";

import { operationKindFor } from "./operationKind";

describe("operationKindFor", () => {
  it("names the kind for a plain document, which urql checks against the AST", () => {
    const document = parse("query Books { books { id } }");

    expect(operationKindFor(document, "query")).toBe("query");
  });

  // A persisted document has no AST, so urql reads `undefined` off it — and the only
  // value that matches is `undefined`. Naming the kind here throws in dev.
  it("answers undefined for a persisted document, whose AST was stripped", () => {
    const persisted = { documentId: "abc123", kind: "Document", definitions: [] };

    expect(operationKindFor(persisted, "query")).toBeUndefined();
  });

  it("answers undefined for a document with no definitions field at all", () => {
    expect(operationKindFor({ documentId: "abc123" }, "mutation")).toBeUndefined();
  });

  it("survives a null document rather than throwing on the way to urql", () => {
    expect(operationKindFor(null, "query")).toBeUndefined();
  });
});
