import type { TadaPersistedDocumentNode } from "gql.tada";
import type { AnyVariables, GraphQLRequest } from "@urql/core";
import type { FetchBody } from "@urql/core/internal";

/**
 * Builds the request body for a *persisted* document: the server already holds the query
 * text, so only its id and the variables go on the wire.
 *
 * This is deliberately not urql's `@urql/exchange-persisted`, which sends the document
 * alongside a SHA-256 hash and falls back to the full query on a cache miss. A server
 * that resolves ids from a build-time manifest (what `gql.tada generate persisted`
 * produces) never wants the document sent at all — that is the point of persisting it.
 */
export function makePersistedFetchBody<
  Data = unknown,
  Variables extends AnyVariables = AnyVariables,
>(request: Omit<GraphQLRequest<Data, Variables>, "key">): FetchBody {
  const body = {
    id: (request.query as TadaPersistedDocumentNode).documentId,
    variables: request.variables ?? undefined,
  };

  return body as never as FetchBody;
}
