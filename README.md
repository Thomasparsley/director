# director

Monorepo for the `@director/*` reusable UI / admin product line, built as a chain of Nuxt layers.

```
@director/common   shared logic (utils, composables, types) — no components
      ▲                    ▲                    ▲
@director/ui         @director/forms      @director/dialogs   open a component as a modal / sheet
      ▲    ▲            ▲       ▲                             from anywhere — state only, no components
      │    └─ @director/form-ui │     inputs bound to a FormControl (<DFormInput>) — the ui × forms bridge
      │                         │
@director/core            @director/filters   URL-persisted filter state built on forms — no components
```

Consuming apps (e.g. firesport) install and `extends: ["@director/core", "@director/forms"]`.

Why it is shaped this way — the layer graph, the TypeScript 6 pin, the forms model,
the component authoring convention — is recorded in [docs/adr](docs/adr/README.md).

## Stack

- **pnpm workspaces** — packages live in `packages/*`, linked via `workspace:*`.
- **Changesets** — versioning + publishing to a private registry (`@director` scope, see `.npmrc`).
- **Playground** — the dev app in `playground/` is the workbench: it extends the whole chain,
  so it is where the layers are seen working together (`pnpm dev`).
- **Vitest** — per package, colocated `*.spec.ts` (`pnpm -r test`).

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install` | Install + link the workspace |
| `pnpm dev` | Run the playground app (extends the full layer chain) |
| `pnpm typecheck` | Typecheck every package |
| `pnpm changeset` | Record a version bump |
| `pnpm release` | Publish changed packages |

> This repo uses pnpm via corepack. If `pnpm` isn't on your PATH, run `corepack enable` first.

## Layout

```
packages/
  common/   @director/common
  ui/       @director/ui   (uno.config.ts + design tokens live here)
  core/     @director/core
  forms/    @director/forms
  form-ui/  @director/form-ui
  filters/  @director/filters
  dialogs/  @director/dialogs
playground/ dev app that extends the whole chain — the only place it is assembled for real
```

## Design tokens

The UnoCSS theme (`packages/ui/uno.config.ts` + `uno.colors.ts`) is the single source of truth;
the palette is ported from firesport. Apps re-export it from their own `uno.config.ts` so
`@unocss/nuxt` can discover it — a layer cannot ship a Uno config transitively, so this step is
mandatory for every consumer (see [ADR-0007](docs/adr/0007-design-tokens-palette-in-the-uno-theme.md)):

```ts
// app uno.config.ts
export { default } from "@director/ui/uno.config";
```
