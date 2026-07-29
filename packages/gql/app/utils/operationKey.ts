import { print } from "graphql";
import type { TadaDocumentNode, TadaPersistedDocumentNode, VariablesOf } from "gql.tada";
import { hash } from "ohash";

/**
 * Derives the stable key an operation is cached under — both in the SSR payload and in
 * the in-flight promise cache behind `executeSharedQuery`.
 *
 * The key covers the document *and* its variables, so the same query with different
 * variables hydrates from different payload entries. A persisted document has no AST to
 * print, so its `documentId` stands in for the query text.
 *
 * @param node - The document being executed.
 * @param variables - The variables it is executed with, if any.
 * @param key - An explicit key from the caller, which always wins.
 */
export function makeGraphqlDocumentOperationKey<T>(
  node: TadaDocumentNode<T, VariablesOf<T>>,
  variables?: unknown,
  key?: string,
): string {
  if (key) {
    return key;
  }

  const operationName = (node as TadaPersistedDocumentNode).documentId;
  if (operationName) {
    return hash({ operationName, variables });
  }

  return hash({ query: print(node), variables });
}
