import { graphql } from "graphql";

import { rootValue, schema } from "../graphql/schema";
import type { GraphqlContext } from "../graphql/schema";

/**
 * The same endpoint over GET, with the operation in the query string.
 *
 * It exists so the `preferGetMethod` config has something real to prove itself against —
 * urql v6 would use this shape by default, and the layer deliberately does not.
 */
export default defineEventHandler(async (event) => {
  const { query, variables } = getQuery<{ query?: string, variables?: string }>(event);

  if (!query) {
    setResponseStatus(event, 400);
    return { errors: [{ message: "No query in the query string." }] };
  }

  const context: GraphqlContext = {
    session: getCookie(event, "session"),
    method: event.method,
  };

  return await graphql({
    schema,
    source: query,
    rootValue,
    variableValues: variables ? JSON.parse(variables) : undefined,
    contextValue: context,
  });
});
