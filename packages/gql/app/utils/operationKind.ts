/**
 * Picks the `kind` to hand `client.createRequestOperation`.
 *
 * In development urql cross-checks that argument against the operation type it reads off
 * the document's AST, and throws when they disagree. A *persisted* document has had its
 * AST stripped at build time, so urql reads `undefined` — and the only value that matches
 * is `undefined`.
 *
 * Upstream hardcoded `undefined` for every operation, which happened to work because that
 * app only ever sent persisted documents; against a plain document it throws
 * `Expected operation of type "undefined" but found "query"` on the very first request.
 * Deriving the kind from the document is what lets both wire formats work.
 */
export function operationKindFor<Kind extends "query" | "mutation" | "subscription">(
  document: unknown,
  kind: Kind,
): Kind {
  const definitions = (document as { definitions?: readonly unknown[] } | null)?.definitions;

  return (definitions && definitions.length > 0 ? kind : undefined) as Kind;
}
