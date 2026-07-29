import { graphql } from "graphql";

import { persistedDocuments } from "../graphql/persisted";
import { rootValue, schema } from "../graphql/schema";
import type { GraphqlContext } from "../graphql/schema";

/**
 * The fixture's HTTP GraphQL endpoint. POST is the layer's default, so this is the route
 * almost every integration spec goes through.
 *
 * It accepts both wire formats the layer can produce: a normal `{ query, variables }`
 * body, and a persisted `{ id, variables }` body that carries no query text at all.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    query?: string
    id?: string
    variables?: Record<string, unknown>
  }>(event);

  const source = body?.id ? persistedDocuments[body.id] : body?.query;

  if (!source) {
    setResponseStatus(event, 400);
    return {
      errors: [{
        message: body?.id
          ? `Unknown persisted document id "${body.id}".`
          : "No query in the request body.",
      }],
    };
  }

  const context: GraphqlContext = {
    session: getCookie(event, "session"),
    method: event.method,
  };

  return await graphql({
    schema,
    source,
    rootValue,
    variableValues: body.variables,
    contextValue: context,
  });
});
