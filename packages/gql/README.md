# @directorkit/gql

GraphQL for Nuxt apps, as a logic-only Nuxt layer: **one urql client per app**, built
from your `app.config`, with typed query / mutation / subscription composables on top of
it — SSR payload hydration, abortable queries, debounced refetching on reactive
variables, shared-query collapsing, and typed per-code handling of a mutation payload's
own `errors` list.

The layer never assumes a server. Your app supplies the endpoint, the wire format, the
exchanges and the error routing through the **`gql` key of `app.config`** — and keeps its
own schema binding (`initGraphQLTada`), because that is the one thing no shared layer can
own. It ships **no components** (see ADR-0021).

## Install

```bash
pnpm add @directorkit/gql @urql/core graphql gql.tada
```

`@urql/core`, `graphql` and `gql.tada` are peer dependencies: your app imports them too
(for `initGraphQLTada`, and for any exchange you write), and two copies would mean two
incompatible sets of types. Add `graphql-ws` only if you use subscriptions.

Then add the layer to your `extends`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ["@directorkit/gql"],
});
```

The plugin builds the client automatically — but it refuses to boot (with a dev warning)
until you configure `gql.url`. Adding the layer is safe but inert until then.

## Configure

All configuration lives under the `gql` key of `app.config`. Only `url` is required.
Type the entry with `satisfies GqlAppConfig` (the layer deliberately does not augment
`nuxt/schema` — a layer ships raw source, and augmentation does not survive being compiled
by the consumer's program):

```ts
// app/app.config.ts
import type { GqlAppConfig } from "#layers/director-gql/app/types/appConfig";

export default defineAppConfig({
  gql: {
    // REQUIRED. A function is called lazily inside Nuxt context, so it can read runtime config.
    url: () => useRuntimeConfig().public.gqlEndpoint,
  } satisfies GqlAppConfig,
});
```

### Everything else

| Key | Default | What it does |
| --- | --- | --- |
| `url` | — | **Required.** The HTTP endpoint; `string` or a lazy `() => string`. |
| `operations` | `"document"` | `"document"` sends the query text; `"persisted"` sends `{ id, variables }`. |
| `preferGetMethod` | `false` | Whether queries go out as GET. urql's own default is `"within-url-limit"`; this layer asks rather than assumes, since many servers only route POST. |
| `fetchOptions` | `{ credentials: "include" }` | Merged into every request. |
| `ssrForwardHeaders` | `["cookie"]` | Headers copied from the incoming SSR request. `[]` forwards nothing. |
| `forwardSubscription` | — | Supplies the subscription transport; its presence installs the subscription exchange (client-side only). |
| `exchanges` | identity | `(defaults, context) => Exchange[]` — where an auth exchange, a cache or retries go. |
| `client` | — | Full escape hatch: build the urql `Client` yourself. |
| `requestTimeoutMs` | — | Abort a request that has not answered in time. Off by default. |
| `ssrCache` | `true` | Write query results into the SSR payload and read them back on hydration. |
| `variablesDebounce` | `{ debounce: 300, maxWait: 500 }` | Refetch debounce for reactive `variables`. |
| `notify` | noop | Where user-facing failures go. |
| `logger` | noop | Logger factory, one per scope. |

### Auth, caching, retries — the `exchanges` hook

The layer's defaults are just a fetch exchange (plus a subscription exchange when you
configured a transport). Notably there is **no `cacheExchange`**: `useQuery` owns its own
state and the layer has its own SSR payload cache, so a second document cache in front of
them mostly causes surprises. Everything else composes here:

```ts
import { authExchange } from "@urql/exchange-auth";
import { cacheExchange } from "@urql/core";

gql: {
  url: () => useRuntimeConfig().public.gqlEndpoint,
  exchanges: defaults => [
    authExchange(async () => ({
      addAuthToOperation: operation => operation,
      didAuthError: error => error.graphQLErrors.some(e => e.extensions?.code === "UNAUTHENTICATED"),
      refreshAuth: async () => { /* your identity layer's refresh */ },
    })),
    cacheExchange,
    ...defaults,
  ],
} satisfies GqlAppConfig
```

Auth deliberately lives here rather than in the layer: it is your identity system's
policy, and wiring it in would make every consumer of this layer depend on that one.

### Subscriptions

```ts
import { makeGraphqlWsForwarder } from "#layers/director-gql/transports/graphqlWs";

gql: {
  url: () => useRuntimeConfig().public.gqlEndpoint,
  forwardSubscription: () => makeGraphqlWsForwarder({
    url: useRuntimeConfig().public.gqlWsEndpoint,
  }),
} satisfies GqlAppConfig
```

`makeGraphqlWsForwarder` is the only place the layer touches `graphql-ws`, and nothing
else imports it — so an app without subscriptions never pulls the package in. Pass your
own `forwardSubscription` for any other transport (SSE, a custom socket).

### Where errors go

The layer has no opinion about toasts. It describes the failure and hands it to `notify`:

```ts
notify: (notice) => {
  useToast({ type: "error", title: notice.title, description: notice.message });
},
```

`notify` is called by `handleMutationResult` (for transport / execution errors) and by
`notifyOnGqlError`, the ready-made `onError` for queries. It is silent by default.

### Timeouts

There is no default timeout: a layer cannot know which of your queries are legitimately
slow, and cutting a report off at an arbitrary deadline is worse than waiting. Set one if
you care about the SSR case, where an unresponsive endpoint holds the render open until
the server itself gives up:

```ts
gql: { url: "…", requestTimeoutMs: 15_000 } satisfies GqlAppConfig
```

### A note on credentials

`fetchOptions` defaults to `credentials: "include"`, and on the server
`ssrForwardHeaders` defaults to `["cookie"]` — so the visitor's session cookie is sent to
whatever `gql.url` points at. That is what you want for a first-party API and a credential
leak if you point it at someone else's. Set `ssrForwardHeaders: []` and your own
`fetchOptions` when talking to a third party.

## Use

### Queries

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useQueryAsync } from "#layers/director-gql/app/composables/query";

import { booksQuery } from "~/gql/documents";

const search = ref("");
const variables = computed(() => ({ search: search.value || null }));

// Awaited in setup: blocks the render, and on the server writes the result into the
// SSR payload so the client hydrates without fetching again.
const { data, pending, error, refresh } = await useQueryAsync(booksQuery, { variables });
</script>
```

A `Ref` in `variables` is watched, and the query refetches — debounced — when it changes.

`useQuery` is the same thing without running: it hands back the state plus `refresh()`,
for a query whose variables are not known at setup time.

| Option | What it does |
| --- | --- |
| `variables` | Required when the document declares any; a plain object or a `Ref`. |
| `transform` | Reshape the result before it lands in `data`. |
| `onError` | Called with the `CombinedError`; `notifyOnGqlError` is a ready-made one. |
| `lazy` | Resolve immediately and let the request land later (ignored on the server). |
| `immediate: false` | Prepare without running. |
| `signal` | Your own `AbortSignal`; one is created for you otherwise. |
| `skipSsrCache` | Neither read nor write the SSR payload for this query. |
| `key` | Override the generated operation key. |

An in-flight query is aborted when its effect scope is disposed, and `refresh()` aborts
the previous one before starting the next.

### Mutations

```ts
import { useMutationAsync } from "#layers/director-gql/app/composables/mutation";
import { handleMutationResult } from "#layers/director-gql/app/utils/handleMutationResult";

const response = await useMutationAsync(addBookMutation, {
  variables: { title, author },
  // The payload — not the whole mutation result — is what carries `errors`.
  transform: data => data.addBook,
});

const result = handleMutationResult({
  response,
  onError: {
    onDuplicateTitle: error => showInline(error.message),
    onTitleRequired: error => showInline(error.message),
  },
});

// `result` has the `errors` field removed and its remaining fields non-nullable.
console.log(result.book.title);
```

`handleMutationResult` separates the two failure channels most schemas have:

- a **transport or execution** error goes to `notify` and is rethrown as-is;
- a **payload-level** `errors` list is dispatched to the matching `on<Code>` handler and
  then thrown as a `GqlResponseError`, whose `handled` flag says whether every error found
  a handler — so a caller can unwind without reporting the same failure twice.

A handler that returns nothing has handled the error; return `false` to decline.

### Shared queries

When several components want the same thing at once (the current user, a lookup list),
`executeSharedQuery` collapses them onto one request:

```ts
import { executeSharedQuery } from "#layers/director-gql/app/utils/operations";
import { makeQueryDataPassthrough } from "#layers/director-gql/app/utils/query";

// One shared state object, owned by whatever outlives the components — a store, a module.
const me = makeQueryDataPassthrough<MeResult>();

await executeSharedQuery(me, () => useQueryAsync(meQuery, undefined, me), { cacheKey: "me" });
```

The first caller runs the query; the rest await it, and everyone reads the result off the
shared `me`. Pass `forceFetch: true` to refetch over data that is already there.

`executeSharedQuery` needs the *ref-carrying* state (`makeQueryDataPassthrough`), not
`makeQueryStoreData` — the latter is the same three fields unwrapped, for holding query
state inside a store that does its own reactivity.

### Subscriptions

```ts
import { useSubscriptionAsync } from "#layers/director-gql/app/composables/subscribe";

const observable = useSubscriptionAsync(onBookAddedSubscription);
const { unsubscribe } = observable.subscribe(({ data }) => { /* … */ });
```

## Your schema stays yours

The layer accepts any `TadaDocumentNode`; it never sees your schema. Keep the gql.tada
setup in your app:

```ts
// gql/index.ts
import { initGraphQLTada } from "gql.tada";
import type { introspection } from "./graphql-env.d.ts";

export const graphql = initGraphQLTada<{
  introspection: introspection
  scalars: { /* your scalar mapping */ }
}>();
```

Persisted documents (`gql.tada generate persisted`) work the same way — set
`operations: "persisted"` and the layer sends `{ id, variables }` instead of the query
text.

## Testing

Two suites, for two different questions.

```bash
pnpm test              # unit: fast, no server
pnpm test:integration  # integration: a real Nuxt server, real HTTP, a real WebSocket
```

**Unit** specs run under bare Vitest with a hand-written `#app` stub — see
`test/nuxtApp.ts` and ADR-0008. `vitest.config.ts` rewrites `import.meta.server` /
`client` to globals so a spec can flip sides and exercise the SSR path.

**Integration** specs (ADR-0022) boot `test/fixture`, a minimal Nuxt app that extends this
layer and serves a toy GraphQL schema over both a Nitro route and a `graphql-ws`
WebSocket. The layer's own plugin builds a real urql client against it, so wire formats,
HTTP methods, SSR cookie forwarding, persisted-document resolution and subscription
lifecycle are asserted for real rather than against a fake — including the things only the
server can see, like whether unsubscribing actually released its end.

## License

MIT © Tomáš Petržela
