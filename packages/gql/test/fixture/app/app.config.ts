import type { GqlAppConfig } from "#layers/director-gql/app/types/appConfig";

/**
 * The fixture's consumer contract: exactly what a real app writes, pointed at the
 * fixture's own server.
 *
 * SSR fetches over HTTP like any other client, so the server side needs an absolute URL
 * built from the incoming request — the port is whatever the test runner picked.
 */
export default defineAppConfig({
  gql: {
    url: () => import.meta.server
      ? new URL("/api/graphql", useRequestURL().origin).toString()
      : "/api/graphql",
  } satisfies GqlAppConfig,
});
