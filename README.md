# director

Monorepo for the `@directorkit/*` reusable UI / admin product line, built as a chain of Nuxt layers.

```
@directorkit/common   shared logic (utils, composables, types) — no components
      ▲                    ▲                    ▲
@directorkit/ui         @directorkit/forms      @directorkit/dialogs   open a component as a modal / sheet
      ▲    ▲            ▲       ▲                             from anywhere — state only, no components
      │    └─ @directorkit/form-ui │     inputs bound to a FormControl (<DFormInput>) — the ui × forms bridge
      │                         │
@directorkit/core            @directorkit/filters   URL-persisted filter state built on forms — no components

@directorkit/common ◄── @directorkit/identity   session/auth state behind an app-supplied IdentityApi
                 ◄── @directorkit/gql        one urql client + typed query/mutation composables,
                                          configured in app.config — state only, no components
```

Consuming apps (e.g. firesport) install and `extends: ["@directorkit/core", "@directorkit/forms"]`.

Why it is shaped this way — the layer graph, the TypeScript 6 pin, the forms model,
the component authoring convention — is recorded in [docs/adr](docs/adr/README.md).

## Stack

- **pnpm workspaces** — packages live in `packages/*`, linked via `workspace:*`.
- **Changesets** — versioning + publishing the `@directorkit` scope publicly to npm
  ([ADR-0020](docs/adr/0020-publish-publicly-to-npm.md)); releases run from CI.
- **Playground** — the dev app in `playground/` is the workbench: it extends the whole chain,
  so it is where the layers are seen working together (`pnpm dev`).
- **Vitest** — per package, colocated `*.spec.ts` (`pnpm -r test`).
- **Three test tiers** — unit (`pnpm test`), integration against a real Nuxt server over
  HTTP and WebSocket (`pnpm test:integration`, [ADR-0022](docs/adr/0022-integration-tests-against-a-real-nuxt-server.md)),
  and Playwright E2E through the playground (`pnpm test:e2e`, [ADR-0018](docs/adr/0018-e2e-through-the-playground.md)).

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install` | Install + link the workspace |
| `pnpm dev` | Run the playground app (extends the full layer chain) |
| `pnpm typecheck` | Typecheck every package |
| `pnpm test` | Unit tests, every package |
| `pnpm test:integration` | Integration tests against a real Nuxt server |
| `pnpm test:e2e` | Playwright E2E through the playground |
| `pnpm changeset` | Record a version bump |
| `pnpm release` | Publish changed packages (CI does this — see below) |

> This repo uses pnpm via corepack. If `pnpm` isn't on your PATH, run `corepack enable` first.

## Releasing

Releases are cut from a **tag**. Every user-visible change lands with a changeset
(`pnpm changeset`); when it is time to ship:

```bash
pnpm version-packages                  # applies the changesets: versions + CHANGELOGs
git commit -am "chore: version packages"
git tag -a v0.1.0 -m "v0.1.0"          # annotated: --follow-tags skips lightweight tags
git push origin main --follow-tags
```

> The `-a` is not cosmetic. `git tag v0.1.0` makes a *lightweight* tag, which
> `--follow-tags` silently declines to push — the commit lands, no tag appears on the
> remote, and the release workflow simply never fires.

`.github/workflows/release.yml` fires on any `v<major>.<minor>.<patch>` tag. It
refuses a tag whose commit is not on `main` or that still has pending changesets,
re-runs typecheck and tests, then publishes to npm with provenance. `changeset
publish` only sends versions the registry does not already have, so a tag that
bumped one layer publishes one package.

The workflow needs one secret, `NPM_TOKEN` — an npm automation token for the
`@directorkit` scope.

> The tag is a repo-level release marker, not a package version. The layers version
> independently ([ADR-0003](docs/adr/0003-pnpm-workspace-changesets-private-scope.md)),
> so `v0.1.0` need not equal any one package's version.

To check what a package would actually ship before releasing it:

```bash
pnpm --filter @directorkit/ui exec npm pack --dry-run
```

## Layout

```
packages/
  common/   @directorkit/common
  ui/       @directorkit/ui   (uno.config.ts + design tokens live here)
  core/     @directorkit/core
  forms/    @directorkit/forms
  form-ui/  @directorkit/form-ui
  filters/  @directorkit/filters
  dialogs/  @directorkit/dialogs
  identity/ @directorkit/identity
  gql/      @directorkit/gql
playground/ dev app that extends the whole chain — the only place it is assembled for real
```

## Design tokens

The UnoCSS theme (`packages/ui/uno.config.ts` + `uno.colors.ts`) is the single source of truth;
the palette is ported from firesport. Apps re-export it from their own `uno.config.ts` so
`@unocss/nuxt` can discover it — a layer cannot ship a Uno config transitively, so this step is
mandatory for every consumer (see [ADR-0007](docs/adr/0007-design-tokens-palette-in-the-uno-theme.md)):

```ts
// app uno.config.ts
export { default } from "@directorkit/ui/uno.config";
```
