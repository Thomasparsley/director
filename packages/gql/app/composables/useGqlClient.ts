import { useNuxtApp } from "#app";
import type { Client } from "@urql/core";

/**
 * The app's urql client, created once by the plugin.
 *
 * @throws when the app has not configured `gql.url` in app.config — without an endpoint
 * there is no client, and failing here says so rather than surfacing as a confusing
 * `undefined` deeper in a query.
 */
export function useGqlClient(): Client {
  const { $gqlClient } = useNuxtApp() as { $gqlClient?: Client };
  if (!$gqlClient) {
    throw new Error(
      "[gql] GraphQL client not found. Set `gql.url` in app.config so the gql plugin "
      + "can boot (see GqlAppConfig).",
    );
  }
  return $gqlClient;
}

/**
 * The request options every operation goes out with: the app's configured
 * `fetchOptions`, plus the forwarded request headers when running on the server.
 */
export function useGqlBaseFetchOptions(): RequestInit {
  const { $gqlBaseFetchOptions } = useNuxtApp() as {
    $gqlBaseFetchOptions?: () => RequestInit
  };
  return $gqlBaseFetchOptions ? $gqlBaseFetchOptions() : {};
}

/**
 * The per-app cache of in-flight query promises, keyed by the caller's cache key.
 * Backs `executeSharedQuery`, which collapses concurrent callers onto one request.
 */
export function useGqlQueryPromiseCache(): Map<string, Promise<unknown>> {
  const { $gqlQueryPromiseCache } = useNuxtApp() as {
    $gqlQueryPromiseCache?: Map<string, Promise<unknown>>
  };
  if (!$gqlQueryPromiseCache) {
    throw new Error(
      "[gql] Query promise cache not found — the gql plugin did not run. Is the "
      + "@director/gql layer in `extends`?",
    );
  }
  return $gqlQueryPromiseCache;
}
