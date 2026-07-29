import { GraphQLError, parse } from "graphql";
import { makeHooks } from "graphql-ws/use/crossws";

import { persistedDocuments } from "../graphql/persisted";
import { rootValue, schema, subscriptionRootValue } from "../graphql/schema";

/**
 * A real `graphql-ws` server on a real WebSocket.
 *
 * Nitro's WebSocket support is crossws-based, and graphql-ws ships a crossws adapter
 * whose hooks (`open` / `message` / `close` / `error`) are exactly the shape
 * `defineWebSocketHandler` wants — so the protocol implementation is the library's, not
 * the fixture's. `nitro.experimental.websocket` must be on for this route to bind.
 */
export default defineWebSocketHandler(
  makeHooks({
    schema,
    roots: {
      query: rootValue,
      mutation: rootValue,
      subscription: subscriptionRootValue,
    },

    /**
     * Persisted operations over the socket. The layer's persisted forwarder sends
     * `{ id, variables }` with an empty `query` — graphql-ws would fail to parse that, so
     * the id is resolved here before it gets that far. Returning nothing falls through to
     * the default handling for a normal document.
     */
    onSubscribe: (_ctx, _id, payload) => {
      const documentId = (payload as { id?: string }).id;
      if (!documentId) {
        return;
      }

      const source = persistedDocuments[documentId];
      if (!source) {
        return [new GraphQLError(`Unknown persisted document id "${documentId}".`)];
      }

      return {
        schema,
        document: parse(source),
        variableValues: payload.variables,
        rootValue: subscriptionRootValue,
      };
    },
  }),
);
