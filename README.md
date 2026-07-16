# director

Monorepo for the `@director/*` reusable UI / admin product line, built as a chain of Nuxt layers.

```
@director/common   shared logic (utils, composables, types) — no components
      ▲         ▲
@director/ui    @director/forms   reactive form model (controls, groups, validators) — no components
      ▲               ▲
@director/core  @director/filters   URL-persisted filter state built on forms — no components
```

Consuming apps (e.g. firesport) install and `extends: ["@director/core", "@director/forms"]`.

## Stack

- **pnpm workspaces** — packages live in `packages/*`, linked via `workspace:*`.
- **Changesets** — versioning + publishing to a private registry (`@director` scope, see `.npmrc`).
- **Histoire** — component workbench in `@director/ui`.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install` | Install + link the workspace |
| `pnpm dev` | Run the playground app (extends the full layer chain) |
| `pnpm story` | Run Histoire for `@director/ui` |
| `pnpm typecheck` | Typecheck every package |
| `pnpm changeset` | Record a version bump |
| `pnpm release` | Publish changed packages |

> This repo uses pnpm via corepack. If `pnpm` isn't on your PATH, run `corepack enable` first.

## Layout

```
packages/
  common/   @director/common
  ui/       @director/ui   (uno.config.ts + tokens + Histoire live here)
  core/     @director/core
  forms/    @director/forms
  filters/  @director/filters
playground/ dev app that extends @director/core + @director/forms + @director/filters
```

## Design tokens

The UnoCSS theme (`packages/ui/uno.config.ts` + `uno.colors/variables/preflight.ts`) is the
single source of truth, ported from firesport. Apps re-export it from their own `uno.config.ts`
so `@unocss/nuxt` can discover it:

```ts
// app uno.config.ts
export { default } from "@director/ui/uno.config";
```
