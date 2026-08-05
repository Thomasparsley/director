# `@directorkit/gql` — port status and adoption guide

**The layer is built.** `packages/gql` extends `@directorkit/common`, carries 156 unit specs,
32 integration specs against a real Nuxt server (HTTP + WebSocket), and a playground demo
with 5 E2E specs, and typechecks with the rest of the graph. The
decisions behind it — and the upstream defects fixed on the way — are recorded in
[ADR-0021](adr/0021-the-gql-layer.md); the consumer-facing documentation is
[`packages/gql/README.md`](../packages/gql/README.md).

This file keeps the part that is still ahead: **moving an existing app off its own
GraphQL layer and onto this one.**

## What shipped

| Area | Outcome |
| --- | --- |
| Composables | `useQuery`, `useQueryAsync`, `useMutationAsync`, `useSubscriptionAsync`, `useGqlClient`, `useGqlRuntime` |
| Utils | `executeQuery`, `executeMutation`, `executeSharedQuery`, `handleMutationResult`, `notifyOnGqlError`, `makeQueryDataPassthrough`, `makeQueryStoreData`, `makeGraphqlDocumentOperationKey`, `makeGraphqlWsForwarder` |
| Exchanges | `persistedFetchExchange`, `persistedSubscriptionExchange`, `makePersistedFetchBody` |
| Wiring | one `app/plugins/gql.ts` for both sides; `gql` in `app.config` resolved by `useGqlRuntime()` |
| Left in the app | `initGraphQLTada`, `graphql-env.d.ts`, scalars, the introspection-inference helper, persisted-document build tooling, the auth exchange, toast wiring |

Two design points differ from the original plan, both for the better:

- **No `wsUrl` config key.** Subscriptions are enabled by `gql.forwardSubscription`
  instead. A `wsUrl` would have forced the layer to import `graphql-ws` unconditionally to
  honour it; keeping the import inside `makeGraphqlWsForwarder` — which nothing else in
  the layer imports — is what lets `graphql-ws` stay an optional peer dependency.
- **`preferGetMethod` is now part of the config surface**, defaulting to `false`. It had
  to be: urql v6 defaults it to `"within-url-limit"`, which silently turns queries into
  GETs, and upstream was only avoiding that by accident (see ADR-0021).

## Adopting it in an app that has its own GraphQL layer

1. **Install.** `pnpm add @directorkit/gql @urql/core graphql gql.tada` (plus `graphql-ws`
   only if the app uses subscriptions). The three besides the layer are peer dependencies
   — the app imports them too, and two copies mean two incompatible sets of types.
2. **Extend.** Replace the app's own layer with `"@directorkit/gql"` in `nuxt.config.ts`.
3. **Configure.** Add the `gql` key to `app.config.ts`. An app coming from a
   persisted-documents, cookie-session backend looks like this:

   ```ts
   gql: {
     url: () => useRuntimeConfig().public.gqlEndpoint,
     operations: "persisted",
     forwardSubscription: () => makeGraphqlWsForwarder({
       url: useRuntimeConfig().public.gqlWsEndpoint,
     }),
     exchanges: defaults => [myAuthExchange, ...defaults],
     notify: n => useToast({ type: "error", title: n.title, description: n.message }),
     logger: scope => useLogger(scope),
   } satisfies GqlAppConfig
   ```

   The auth exchange moves here from the deleted plugin — that is deliberate, not a
   workaround: auth policy belongs to the app's identity system, and wiring it into the
   layer would make every consumer depend on that one.
4. **Rewrite the imports.** The old layer's barrel becomes deep imports:
   `~~/layers/gql/app` → `#layers/director-gql/app/composables/query` (and friends). The
   composable names are unchanged, so call sites themselves do not move.
5. **Audit three renames.** `skipSrrCache` → `skipSsrCache` (typo fixed);
   `showToastOnGqlError` → `notifyOnGqlError`; `fetchPersistedExchange` /
   `subscriptionPersistedExchange` → `persistedFetchExchange` /
   `persistedSubscriptionExchange`.
6. **Audit the `on<Code>` handlers.** `handleMutationResult` used to count every
   correctly-typed handler as *unhandled*, because it branched on a return value its own
   type said was `void`. Now a handler that returns nothing has handled the error, and
   only an explicit `false` declines. Any handler that was relying on the old behaviour to
   let a failure fall through needs `return false`.
7. **Keep the schema binding.** `gql/index.ts`, `graphql-env.d.ts`, the scalars and the
   persisted-document build step do not move. The layer accepts any `TadaDocumentNode`.
8. **Delete** the app's own gql layer and its copies of the exchanges.
9. **Verify** the four things the port changed on the wire: operations still go out as
   POST (or set `preferGetMethod` if the server prefers GET), a persisted body is still
   `{ id, variables }`, SSR still forwards the session cookie (log in, then hard-reload a
   protected page), and subscriptions still connect.

## Still open

- ~~Subscriptions have no E2E.~~ Resolved: they are covered by the integration tier
  ([ADR-0022](adr/0022-integration-tests-against-a-real-nuxt-server.md)), which runs a real
  `graphql-ws` server over a real socket in `packages/gql/test/fixture` — including the
  teardown assertion only the server can make. The playground still has no subscription
  demo, which is a demo gap rather than a coverage one.
- **The playground types its documents by hand** rather than running gql.tada codegen.
  The toy schema is small enough for that to be honest, but a consumer's setup — schema
  file, `graphql.config`, generated `graphql-env.d.ts` — is not demonstrated end to end
  here.
- **`infer.ts` did not port.** The introspection-inference helper is a nice trick and a
  candidate for a later generic `@directorkit/gql` export parameterised on the app's
  introspection type.
