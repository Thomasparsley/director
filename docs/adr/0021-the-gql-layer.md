# 0021 — The gql layer: one configured urql client behind app.config

Status: Accepted

## Context

firesport carries a GraphQL layer built on urql and gql.tada: typed `useQuery` /
`useQueryAsync` / `useMutationAsync` / `useSubscriptionAsync` composables over a single
client, with an SSR payload cache so a server-rendered query is not fetched twice, an
in-flight promise cache so concurrent callers of the same shared query collapse onto one
request, abortable queries, debounced refetching when variables are reactive, and a
`handleMutationResult` that turns a payload's own `errors` list into typed per-code
handlers.

That machinery generalises. What sat next to it did not: the endpoint came from two
hardcoded `runtimeConfig` keys, every operation went out as a persisted document id,
`credentials: "include"` was baked in, an `authExchange` encoded one backend's
`AUTH_NOT_AUTHENTICATED` convention, and two files imported that app's toast system and
its logger directly.

The structural question was the same one ADR-0019 answered for identity, and it has the
same answer: **the flows are the same everywhere; the transport is never the same twice.**

There was also a second question, specific to this layer. Upstream's composables are
typed against `~~/gql` — the app's own gql.tada instance. That reads like hard coupling
to one schema. It is not: the three types the layer actually uses (`ResultOf`,
`VariablesOf`, `DocumentDecoration`) are re-exports of gql.tada's *generic* helpers,
parameterised by the document. Importing them from `gql.tada` directly removes the app
coupling completely — no adapter type, no generic parameter on the layer.

## Decision

**`@director/gql` is a logic-only layer extending `@director/common`. It owns one urql
client per Nuxt app, built from a `gql` key in `app.config`; the app owns its schema
binding and its endpoint.**

- **The seam is `app.config`, resolved once by `useGqlRuntime()`** — the same shape as
  identity's runtime resolver, memoised on the Nuxt app so the plugin and every
  composable agree. Only `gql.url` is required. Without it the plugin provides
  `undefined` (and warns in dev) and `useGqlClient()` throws a descriptive error: a layer
  in `extends` must never crash an app that has not configured it yet.
- **The app keeps `initGraphQLTada`.** The schema binding, the generated
  `graphql-env.d.ts`, the domain scalars and any persisted-document build step stay in
  the consuming app. The layer accepts any `TadaDocumentNode`.
- **Both wire formats ship.** `operations: "document"` (the default) uses urql's standard
  fetch exchange; `operations: "persisted"` sends `{ id, variables }` through ported
  copies of urql's fetch and subscription exchanges. The default is `"document"` because
  persisted operations need build tooling the layer does not ship — an unconfigured app
  must get the format that works against any server.
- **The auth exchange does not port.** Auth policy is identity's business, and baking it
  in would make `@director/gql` depend on `@director/identity`. Apps compose them through
  `gql.exchanges`, which receives the layer's defaults in order and returns the list to
  use. The defaults deliberately contain **no `cacheExchange`**: `useQuery` owns its own
  state and the layer has its own SSR payload cache, so a second document cache in front
  of them mostly causes surprises.
- **Failures are announced through `gql.notify`, not a toast import.** The layer describes
  the failure (`{ kind, title, message, error }`) and the app decides where it goes — a
  toast, a banner, an error tracker, or nowhere, which is the default. `gql.logger`
  follows identity's pattern and is silent by default.
- **One plugin, not two.** Upstream had near-duplicate `.client` and `.server` plugins
  differing in three places. They are one file branching on `import.meta.server`, which
  is what stops them drifting. The server reads the incoming request's headers once at
  plugin setup — `ssrForwardHeaders`, `["cookie"]` by default — because the server has no
  cookie jar of its own and an SSR query would otherwise run unauthenticated.
- **Subscriptions are opt-in through `gql.forwardSubscription`.** Its presence installs
  the subscription exchange (client-side only) and supplies its transport. The layer ships
  `makeGraphqlWsForwarder` for the usual `graphql-ws` case in **`transports/`, deliberately
  outside `app/`**: Nuxt puts `<layer>/app/**` into the consuming app's TypeScript program,
  so a file in there importing `graphql-ws` would make every consumer install the package
  just to typecheck — even one that never subscribes. Out of `app/`, the module joins the
  program only of an app that actually imports it, which is what makes the optional peer
  dependency real rather than aspirational. A `wsUrl` config key was considered and
  dropped for the same reason: honouring it would have forced an unconditional import.

### Upstream defects fixed in the port

The port kept the design and fixed the bugs. Three were load-bearing:

1. **The operation kind was hardcoded to `undefined`.** urql cross-checks that argument
   against the document's AST in development, and a *persisted* document has no AST — so
   `undefined` was the only value that matched. Against a plain document it throws on the
   first request. The kind is now derived from the document, which is what lets both wire
   formats work. That single constant was also masking two more behaviours: urql only
   self-terminates a result source when the kind is *not* `"query"` (so the query promise
   now completes via an explicit `take(1)`, matching the one-result-per-call contract that
   `refresh()` implies), and urql v6 defaults `preferGetMethod` to `"within-url-limit"`,
   which silently turns queries into GETs. The layer defaults it to `false` and exposes it:
   plenty of servers only route POST, and a layer cannot know which.
2. **Base fetch options were passed as the operation context instead of inside it.**
   `{ credentials, headers }` went where urql expected `{ fetchOptions }`, so on any path
   without an abort signal the credentials and the forwarded SSR cookies were dropped.
3. **`refresh()` created an `AbortController` and never sent its signal**, so aborting it
   cancelled nothing and each refresh raced the last.

The rest: a successful run never cleared the previous run's error, so `refresh()` after a
failure left a stale error sitting next to fresh data and any template watching `error`
stayed broken (both executors now reset it when a run begins, and the SSR payload holds the
**raw** response so two call sites transforming one document no longer collide on its cache
key); a rejected mutation logged its cause and left `error` unset, so callers reported
a generic failure with the cause gone; `handleMutationResult` typed its per-code handlers
as returning `void` while branching on their return value, so every correctly-typed handler
counted as unhandled (now `boolean | void`, and only an explicit `false` declines); a
missing payload was checked for `null` but not `undefined`, turning "no data" into a
TypeError; an in-flight query was never aborted when its scope was disposed — and neither
was a subscription, which matters more since a socket is not collected on its own;
`GqlError` included `undefined` twice; and `skipSrrCache` was a typo.

### Testing

Unit specs cover the pure core and both executors against a fake urql client — including
the SSR payload path, which is reachable because `vitest.config.ts` rewrites
`import.meta.server` / `client` to globals a test can flip. E2E (ADR-0018) runs the
playground against a **toy GraphQL server of its own** (`server/api/graphql.post.ts`,
`graphql`'s `buildSchema` over an in-memory list), which is what makes SSR-fetch,
hydrate-from-payload, reactive-variable refetch and both failure channels observable.
The demo page types its documents by hand rather than adding gql.tada codegen to this
repo; the toy schema is small enough for that to be honest, and the layer accepts any
`TadaDocumentNode` either way. **Subscriptions have no E2E**: a `graphql-ws` server in the
playground is disproportionate for a demo page — they are covered instead by the
integration tier ([ADR-0022](0022-integration-tests-against-a-real-nuxt-server.md)), which
runs a real `graphql-ws` server over a real socket in a purpose-built fixture.

## Consequences

- Consumers get the whole machinery — SSR hydration, shared-query collapsing, abortable
  queries, typed mutation-error handling — by extending the layer and writing one config
  object. Nothing about their server is assumed.
- `gql.url` is mandatory configuration. Adding the layer is safe but inert until an app
  commits to an endpoint.
- **There is no default request timeout.** `gql.requestTimeoutMs` exists and is off unless
  set: a layer cannot know which of an app's queries are legitimately slow, and cutting a
  report off at an arbitrary deadline is worse than waiting. The case for setting it is
  SSR, where an unresponsive endpoint holds the render open until the server gives up.
- **The defaults send credentials.** `credentials: "include"` plus
  `ssrForwardHeaders: ["cookie"]` mean the visitor's session cookie reaches whatever
  `gql.url` is — correct for the first-party API this is built for, a leak if pointed at a
  third party. Documented in the README rather than defended in code, because the safe
  default would break the common case.
- Defaulting `preferGetMethod` to `false` and shipping no `cacheExchange` are both
  deliberate departures from urql's defaults. An app that wants urql's behaviour opts in;
  the layer's defaults are the ones that work against the widest range of servers.
- The demo page disables its controls until mounted. That started as an E2E need — the
  list is server-rendered, so the controls are clickable before their handlers exist — but
  it is the honest behaviour for any SSR page whose controls need JS, and it gives the
  specs a real state to wait on instead of a timeout.
- `app.config` holds functions here, same as identity: legal (app config is bundled, not
  serialized), but it means environment-dependent values cannot come from `nuxt.config`'s
  `runtimeConfig` directly — `gql.url` may be a function, which is called lazily inside
  Nuxt context and can read `useRuntimeConfig()` itself.
- Left behind on purpose: the schema binding and scalars, the persisted-document build
  tooling, the introspection-inference helper (a candidate for a later generic port), the
  auth exchange, and the toast wiring.
