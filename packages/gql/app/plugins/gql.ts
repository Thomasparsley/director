import { defineNuxtPlugin, useRequestHeaders } from "#app";
import { Client, fetchExchange, subscriptionExchange } from "@urql/core";
import type { Exchange } from "@urql/core";

import { useGqlRuntime } from "../composables/useGqlRuntime";
import { persistedFetchExchange } from "../exchanges/persistedFetch";
import { persistedSubscriptionExchange } from "../exchanges/persistedSubscription";
import type { GqlClientContext } from "../types/appConfig";

/**
 * Builds the one urql client per Nuxt app (so: one per request on the server) and shares
 * it, along with the request options every operation goes out with and the in-flight
 * promise cache behind `executeSharedQuery`.
 *
 * One plugin covers both sides. The server differs in exactly two ways — it forwards the
 * incoming request's headers, and it installs no subscription exchange — and keeping that
 * in one file is what stops the two from drifting apart.
 *
 * It refuses to boot until the app configures `gql.url` in app.config: a layer in
 * `extends` must never crash an app that has not configured it yet.
 */
export default defineNuxtPlugin({
  name: "gqlClient",
  enforce: "pre",
  parallel: true,
  setup: () => {
    const runtime = useGqlRuntime();

    if (!runtime.hasUrl) {
      if (import.meta.dev) {
        console.warn(
          "[gql] The @directorkit/gql layer is extended but `gql.url` is not set in "
          + "app.config — the gql plugin will not boot.",
        );
      }
      // Provide `undefined` (rather than nothing) so every return site shares one shape;
      // useGqlClient() turns the missing client into a descriptive error.
      return {
        provide: {
          gqlClient: undefined as Client | undefined,
          gqlBaseFetchOptions: (): RequestInit => ({}),
          gqlQueryPromiseCache: new Map<string, Promise<unknown>>(),
        },
      };
    }

    const isServer = import.meta.server;
    const logger = runtime.logger("Gql:Client");
    const url = runtime.url;

    const context: GqlClientContext = {
      url,
      operations: runtime.operations,
      isServer,
      logger,
    };

    // The server has no cookie jar of its own, so the incoming request's headers are
    // copied onto every outgoing operation. Read once, here: plugin setup is where Nuxt
    // context is guaranteed, and within a request the headers cannot change anyway.
    const forwardedHeaders = isServer && runtime.ssrForwardHeaders.length > 0
      ? useRequestHeaders([...runtime.ssrForwardHeaders])
      : undefined;

    const baseFetchOptions = (): RequestInit => {
      const options = runtime.fetchOptions();
      if (!forwardedHeaders || Object.keys(forwardedHeaders).length === 0) {
        return options;
      }
      return {
        ...options,
        headers: { ...options.headers, ...forwardedHeaders },
      };
    };

    const client = runtime.client
      ? runtime.client(context)
      : new Client({
          url,
          exchanges: buildExchanges(runtime, context),
          fetchOptions: baseFetchOptions,
          preferGetMethod: runtime.preferGetMethod,
        });

    logger.debug("GraphQL client created", { url, operations: runtime.operations, isServer });

    return {
      provide: {
        gqlClient: client as Client | undefined,
        gqlBaseFetchOptions: baseFetchOptions,
        gqlQueryPromiseCache: new Map<string, Promise<unknown>>(),
      },
    };
  },
});

function buildExchanges(
  runtime: ReturnType<typeof useGqlRuntime>,
  context: GqlClientContext,
): Exchange[] {
  const isPersisted = runtime.operations === "persisted";

  // No `cacheExchange`: `useQuery` owns its own state and the layer has its own SSR
  // payload cache, so a second document cache in front of them mostly causes surprises.
  // Apps that want urql's normalized/document cache add it through `gql.exchanges`.
  const defaults: Exchange[] = [
    isPersisted ? persistedFetchExchange : fetchExchange,
  ];

  // Subscriptions are client-only, and only when the app supplied a transport. The fetch
  // exchange above forwards subscription operations rather than handling them, so the
  // subscription exchange goes after it and terminates them.
  if (!context.isServer && runtime.forwardSubscription) {
    const forwardSubscription = runtime.forwardSubscription(context);
    defaults.push(
      isPersisted
        ? persistedSubscriptionExchange({ forwardSubscription })
        : subscriptionExchange({ forwardSubscription }),
    );
  }

  return runtime.exchanges(defaults, context);
}
