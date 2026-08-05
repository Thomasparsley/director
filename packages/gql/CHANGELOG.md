# @directorkit/gql

## 0.1.0

### Minor Changes

- 68dffe0: New layer: `@directorkit/gql` — one urql client per Nuxt app, configured from `app.config`,
  with typed query / mutation / subscription composables on top of it (SSR payload
  hydration, abortable queries, debounced refetching on reactive variables, shared-query
  collapsing, and typed per-code handling of a mutation payload's own `errors` list).

  Your app keeps its schema binding (`initGraphQLTada`) and supplies the endpoint, wire
  format, exchanges and error routing; the layer assumes nothing about the server. Both
  plain documents and gql.tada persisted documents are supported. See ADR-0021.

  Tested at three levels: unit specs against a fake client, integration specs against a
  real Nuxt server over real HTTP and a real WebSocket (ADR-0022), and Playwright E2E
  through the playground.

  `makeGraphqlWsForwarder` lives at `#layers/director-gql/transports/graphqlWs` — outside
  `app/`, so `graphql-ws` is genuinely optional: an app that never subscribes neither
  installs nor typechecks it.

  `@directorkit/common` gains the `NonNullableFields` type helper, which
  `handleMutationResult` uses to drop the `errors` field from a successful payload.

### Patch Changes

- Updated dependencies [68dffe0]
- Updated dependencies [68dffe0]
  - @directorkit/common@0.1.0
