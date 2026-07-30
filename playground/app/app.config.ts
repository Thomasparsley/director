import type { GqlAppConfig } from "#layers/director-gql/app/types/appConfig";
import type { IdentityAppConfig } from "#layers/director-identity/app/types/appConfig";

import { makePasskeyCeremony } from "#layers/director-identity/transports/passkey";

import { makeIdentityMockApi } from "./utils/identityMockApi";
import { makePasskeyMockApi } from "./utils/passkeyMockApi";
import { pushGqlNotice } from "./utils/gqlNotices";

// The playground's identity backend is an in-browser mock (demo / demo) — the point
// is demonstrating the layer's consumer contract: hand `identity.api` an object
// implementing `IdentityApi`, however your project talks to its backend.
export default defineAppConfig({
  identity: {
    api: () => makeIdentityMockApi(),

    // Both halves, because the layer reports passkey support only when it has both. The
    // ceremony is imported HERE, by the app, and not by the layer: `@simplewebauthn/browser`
    // would otherwise land in every consumer's TypeScript program (see transports/passkey.ts).
    passkeyApi: () => makePasskeyMockApi(),
    passkeyCeremony: () => makePasskeyCeremony(),
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
