# Architecture Decision Records

Each ADR records one decision: its context, the alternatives, the decision, and
the consequences. ADRs are append-only — never silently reverse one; supersede it
with a new ADR that links back.

These first sixteen were written **retroactively**, by retracing the commits and
the code. Most of the reasoning was already in the repo — in code comments, in
`pnpm-workspace.yaml`, in the test names — but not in the commit messages, which
are mostly subject lines only. This is where it lives from now on.

| ADR | Title | Status |
| --- | ----- | ------ |
| [0001](0001-nuxt-layers-not-a-built-library.md) | Ship the packages as Nuxt layers, not a built component library | Accepted |
| [0002](0002-the-layer-graph.md) | The layer graph: two chains from common, joined at form-ui | Accepted |
| [0003](0003-pnpm-workspace-changesets-private-scope.md) | pnpm workspace, Changesets, and the private @director scope | Accepted |
| [0004](0004-hold-the-graph-on-typescript-6.md) | Hold the whole graph on TypeScript 6 | Accepted |
| [0005](0005-one-component-four-files.md) | One component, four files (.vue / .types / .variants / .spec) | Accepted |
| [0006](0006-reka-ui-and-component-context.md) | reka-ui for behaviour, symbol-keyed context for compound components | Accepted |
| [0007](0007-design-tokens-palette-in-the-uno-theme.md) | Design tokens: the palette is the UnoCSS theme | Accepted |
| [0008](0008-vitest-per-package.md) | Vitest per package, with the layer aliases re-declared by hand | Accepted |
| [0009](0009-playground-replaces-histoire.md) | The playground replaces Histoire as the workbench | Accepted |
| [0010](0010-the-forms-model.md) | The forms model: four composed abstractions, state only at the leaves | Accepted |
| [0011](0011-patch-write-as-hydration-primitive.md) | `patch(data, { write: true })` is the API-hydration primitive | Accepted |
| [0012](0012-null-is-the-empty-value.md) | null is the empty value; undefined never enters the model | Accepted |
| [0013](0013-eager-and-lazy-twice.md) | Eager and lazy, twice; and validators that do one thing | Accepted |
| [0014](0014-submit-returns-a-callback.md) | `useFormSubmit` returns a callback for post-success work | Accepted |
| [0015](0015-a-filter-is-a-formgroup.md) | A filter is a FormGroup with a storage backend | Accepted |
| [0016](0016-navigation-resolves-its-active-item-once.md) | AppShell is layout only; navigation resolves its active item once | Accepted |

## Reading order

- **How the packages fit together** — 0001, 0002, 0003.
- **Writing a component** — 0005, 0006, 0007.
- **The forms stack** — 0010 first, then 0011 – 0014. 0015 builds on all of them.
- **Why the toolchain looks like that** — 0004 and 0008 are both downstream of
  0001 and 0005; neither makes sense on its own.

## A note on the taxes

Three decisions here are load-bearing for others, and the dependencies are not
obvious from the file names:

- **ADR-0001 (layers, no build)** means consumers compile our source — which is
  why our TypeScript version is *their* problem (ADR-0004) and why they must
  re-export our UnoCSS config (ADR-0007).
- **ADR-0005 (the file quartet)** is why cross-file `import type` is everywhere
  (ADR-0004 again), why UnoCSS must scan `.ts` (ADR-0007), and why there is a
  separate `tsconfig.uno.json`.
- **ADR-0002 (forms is a sibling of ui)** exists because of ADR-0015. Read them
  together or the layer graph looks like over-engineering.

## Cross-repo

otlpobs consumes these packages and has its own ADR for it —
[otlpobs ADR-0014](../../../otlpobs/docs/adr/0014-nuxt-client-and-director-layers.md),
"Nuxt 4 client built on the @director/* layers". It documents the consumer side of
ADR-0001 and ADR-0004: the `link:` specifiers, the duplicate-Vue
transpile/dedupe workaround, and the matching TypeScript 6 override. **Both repos
have to stay off TS 7 for either to build** — a change to ADR-0004 is a change
there too.
</content>
</invoke>
