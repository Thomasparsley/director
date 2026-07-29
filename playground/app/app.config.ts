import type { GqlAppConfig } from "#layers/director-gql/app/types/appConfig";
import type { IdentityAppConfig } from "#layers/director-identity/app/types/appConfig";

import { makeIdentityMockApi } from "./utils/identityMockApi";
import { pushGqlNotice } from "./utils/gqlNotices";

// The playground's identity backend is an in-browser mock (demo / demo) — the point
// is demonstrating the layer's consumer contract: hand `identity.api` an object
// implementing `IdentityApi`, however your project talks to its backend.
export default defineAppConfig({
  identity: {
    api: () => makeIdentityMockApi(),
  } satisfies IdentityAppConfig,

  // @director/gql talks to the playground's own toy server (server/api/graphql.post.ts).
  gql: {
    // SSR fetches over HTTP like any other client, so the server side needs an absolute
    // URL — and it has to be built from the incoming request, since the port is whatever
    // the dev server or the E2E runner picked.
    url: () => import.meta.server
      ? new URL("/api/graphql", useRequestURL().origin).toString()
      : "/api/graphql",

    // The layer never assumes a toast system; it hands failures here and this app decides.
    notify: pushGqlNotice,
  } satisfies GqlAppConfig,
});
