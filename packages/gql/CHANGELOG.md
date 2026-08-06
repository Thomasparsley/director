# @directorkit/gql

## 0.1.1

### Patch Changes

- No code changes — this release fixes three things about the published artifacts that
  0.1.0 got wrong, none of which could be corrected in place.

  **Internal dependencies are caret ranges instead of exact pins.** 0.1.0 declared
  `"@directorkit/common": "0.1.0"`, so a consumer holding two layers from different
  releases would install two copies of `common` — and two Nuxt layers both named
  `director-common` then compete for the same `#layers/director-common` alias. They now
  resolve as `^0.1.1` and dedupe across the 0.1.x line.

  **Packages are published with provenance.** 0.1.0 shipped unattested: the release
  workflow set `NPM_CONFIG_PROVENANCE`, which pnpm does not forward to the npm CLI, so
  the setting did nothing and nobody noticed until the registry was checked afterwards.
  It now lives in each package's `publishConfig`, which pnpm reads directly.

  **READMEs appear on the npm package pages.** They shipped inside the 0.1.0 tarballs but
  never reached the registry metadata that npmjs.com renders from, because pnpm stopped
  sending it — a regression pnpm fixed in 11.13. The repo's pnpm floor moved to 11.20.

- Updated dependencies
  - @directorkit/common@0.1.1

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
