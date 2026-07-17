# 0001 — Ship the packages as Nuxt layers, not a built component library

Status: Accepted

## Context

`@director/*` is a reusable UI / admin product line meant to be consumed by real
apps (firesport first). The conventional shape for that is a component library: a
build step (Vite in library mode, or unbuild), a `dist/`, an `exports` map, and
consumers importing components by name and registering them.

Nuxt offers a second shape — the **layer** — where a package *is* a
`nuxt.config.ts` and the consuming app merges it in with `extends`.

## Decision

Every `@director/*` package is a Nuxt layer. The entry point is the layer config
(`"main": "./nuxt.config.ts"`, e.g. `packages/ui/package.json:5`), the package
ships **raw source** with no build step, and consumers write:

```ts
extends: ["@director/core", "@director/forms"]
```

Concretely:

- **No build.** `files` ships `app/` and `nuxt.config.ts` verbatim, minus the
  specs (`packages/ui/package.json:10-16`, note `"!app/**/*.spec.ts"`). The
  consuming app's Vite compiles our source as if it were its own.
- **Components are auto-registered by the layer**, not imported. Each layer
  declares its own `components` entry with a prefix and `pathPrefix: false`
  (`packages/ui/nuxt.config.ts:21-28`). The path is resolved with
  `fileURLToPath(new URL("./app/components", import.meta.url))` — it must point
  inside the *published package*, not the app that extends it.
- **Modules ride along with the layer.** `@unocss/nuxt`, `@nuxtjs/color-mode`
  and `nuxt-lucide-icons` are declared inside `@director/ui`
  (`packages/ui/nuxt.config.ts:15-19`), so an app that extends it declares none of
  them itself.
- **Cross-layer imports use `#layers/<$meta.name>`**, the alias Nuxt derives from
  each layer's `$meta.name` — e.g. `packages/filters/app/composables/useFilters.ts:1`
  imports `#layers/director-forms/app/composables/useFormGroup`.

## Consequences

- There is no build to run, no `dist/` to keep in sync, and no dual
  ESM/CJS story. Editing a component in this repo is immediately live in any app
  that links it — otlpobs's client does exactly that (see otlpobs ADR-0014) and
  hot-reloads across the repo boundary.
- **Consumers compile our source**, so our TypeScript and our Vue SFCs must be
  digestible by *their* toolchain. That is not free: it is the whole reason
  ADR-0004 has to hold the graph on TypeScript 6, and the reason a consumer's
  UnoCSS must scan our `.ts` files (ADR-0007).
- Layer merge order becomes a real API. An app customizes by overriding files in
  its own `app/`, not by forking — stated in `packages/core/nuxt.config.ts:4-5`.
- **A layer cannot ship a UnoCSS config transitively.** `@unocss/nuxt` resolves
  `uno.config.ts` from the app root, so every consumer must re-export ours
  (ADR-0007). That is a genuine leak in the "extends and you're done" story.
- Specs are excluded from the published package but *are* present in a linked
  checkout, so a linked consumer typechecks slightly more than a registry
  consumer does.
- Components can only be rendered inside a Nuxt build — they rely on
  auto-imports, `#components`, and layer-resolved type imports. That is what
  killed the Histoire workbench (ADR-0009) and what forces the manual stubs in
  the unit tests (ADR-0008).

## Alternatives considered

- **A built component library (Vite library mode + `dist/`).** The portable
  choice: consumable outside Nuxt, and no toolchain coupling to the consumer.
  Rejected because the product *is* Nuxt-shaped — `@director/core` assumes a
  routed Nuxt app (ADR-0002), and half the value is the modules, auto-imports and
  color-mode wiring arriving preconfigured. A library would hand all of that back
  to every app to redo.
- **A Nuxt module per package.** Modules can register components and hook the
  build, but they are code that runs, not config that merges. Layers give
  file-level override semantics for free, which is the customization story we
  want.
</content>
</invoke>
