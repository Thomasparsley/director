import { createClient as createWsClient } from "graphql-ws";
import type { ClientOptions, SubscribePayload } from "graphql-ws";

import type { GqlSubscriptionForwarder } from "../app/types/appConfig";

/**
 * Builds the usual `graphql-ws` subscription transport, ready to hand to
 * `gql.forwardSubscription` in `app.config`:
 *
 * ```ts
 * forwardSubscription: () => makeGraphqlWsForwarder({
 *   url: useRuntimeConfig().public.gqlWsEndpoint,
 * }),
 * ```
 *
 * This module is the ONLY place the layer touches `graphql-ws`, and it deliberately lives
 * OUTSIDE `app/`. Nuxt puts `<layer>/app/**` into the consuming app's TypeScript program,
 * so a file in there importing `graphql-ws` would make every consumer need the package
 * installed just to typecheck — even one that never subscribes. Out here, the file only
 * joins the program of an app that actually imports it, which is what makes the optional
 * peer dependency honest rather than aspirational.
 *
 * The socket is lazy by default: it connects on the first subscription rather than at
 * app boot, so a page that never subscribes never opens one.
 */
export function makeGraphqlWsForwarder(options: ClientOptions): GqlSubscriptionForwarder {
  const wsClient = createWsClient({ lazy: true, ...options });

  return (request) => {
    return {
      subscribe(sink) {
        // A persisted operation has no query text — the body is `{ id, variables }` — but
        // graphql-ws types `query` as required, so it goes over as empty and the server
        // resolves the operation from the id.
        const payload = { ...request, query: request.query ?? "" } as SubscribePayload;
        const unsubscribe = wsClient.subscribe(payload, sink);
        return { unsubscribe };
      },
    };
  };
}
