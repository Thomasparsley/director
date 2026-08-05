# 0002 — The layer graph: two chains from common, joined at form-ui

Status: Accepted

## Context

ADR-0001 settled that each package is a Nuxt layer. This one settles which
packages exist and what may depend on what. The scaffold (`4d8a644`) started with
a single chain — `common → ui → core` — and that held until `@directorkit/forms`
arrived (`37c149f`) and had to be placed.

The obvious place for a form model is "inside ui, next to the inputs." That turned
out to be wrong.

## Decision

Two chains rooted in `@directorkit/common`, joined only at `@directorkit/form-ui`:

```
@directorkit/common   shared logic (utils, composables, types) — no components
      ▲         ▲
@directorkit/ui    @directorkit/forms   reactive form model — no components
      ▲     ▲         ▲     ▲
@directorkit/core  @directorkit/form-ui   @directorkit/filters
```

### `forms` is a sibling of `ui`, not a child

`@directorkit/forms` extends `@directorkit/common` and nothing else
(`packages/forms/nuxt.config.ts:9-11`), and its only dependency is
`@directorkit/common` — no `@directorkit/ui`, no `reka-ui`, no `@internationalized/date`.
Its config states the rule: *"Pure logic, no components."*

The reason is `@directorkit/filters`, which is a **non-UI consumer of the form model**
(ADR-0015): a filter is a `FormGroup` that persists to the URL. If `forms` extended
`ui`, every page that filters a table would pull a component kit, UnoCSS, and
reka-ui in to hold three query params.

### `form-ui` is the diamond join, and can live nowhere else

`@directorkit/form-ui` is the only layer that extends both
(`packages/form-ui/nuxt.config.ts:11-14`). Its components bind a `FormControl` to a
`D*` input — value, error display, and blur → transform + validate — *"so app code
never repeats that plumbing"* (`nuxt.config.ts:3-5`).

That code needs both siblings, so it fits in neither: putting `DFormInput` in `ui`
would make `ui` depend on `forms`; putting it in `forms` would make `forms` depend
on `ui` and break `filters`. A third layer is the only shape that keeps both
arrows pointing the way they do.

The prefixes encode the split: `ui` registers with `D` (`<DInput>`), `form-ui`
with `DForm` (`<DFormInput>`). Both flat, both auto-imported; a caller sees
`<DInput v-model>` and `<DFormInput :control>` as peers.

### `ui` and `core` split on `vue-router`

The sharpest line in the repo is a peer dependency. `@directorkit/ui` peers on
`nuxt` and `vue`; `@directorkit/core` peers on `nuxt`, `vue`, **and `vue-router`**
(`packages/core/package.json:26-30`).

`ui` components are route-agnostic — they work anywhere Vue works. `core` is
"pre-built administration building blocks (shells, CRUD / table / form scaffolds)"
(`packages/core/nuxt.config.ts:3-4`) and its navigation is built on `useRoute`,
`useRouter` and `NuxtLink`. **ui = works anywhere Vue works; core = assumes a
routed Nuxt app.**

`ui` is also the only layer that registers Nuxt modules and the only one that
ships `uno.config` (ADR-0007) — it owns the design-system infrastructure, and
`core` inherits all of it by extending.

## Consequences

- An app can extend `@directorkit/ui` alone and skip core's opinions entirely —
  which is the point of `core/nuxt.config.ts:4-5`: *"Apps customize via Nuxt layer
  overrides, not forking."*
- **`filters` is not reachable from `core`.** An app that extends only
  `@directorkit/core` gets no filters and no forms; it must list them:
  `extends: ["@directorkit/core", "@directorkit/forms"]`. The graph enforces that as a
  product decision, not an accident.
- The impedance mismatches concentrate at `form-ui`. It is the only layer that
  needs `@internationalized/date`, because reka's date fields speak it and the
  forms model deliberately does not (`packages/form-ui/app/utils/date.ts:12-14`:
  *"The forms layer models dates as plain `Date` … The reka-based fields speak
  @internationalized/date. These conversions are the bridge"*). `forms` stays
  transport-shaped; the adapter is quarantined.
- Four extends targets instead of one is more for a consumer to get right, and
  the failure is quiet: forget `@directorkit/forms` and `useFormGroup` is simply not
  auto-imported.

## Alternatives considered

- **One `@directorkit/ui` containing components and the form model.** Simplest to
  consume, and it was the shape until `filters` existed. Rejected: it makes URL
  filter state depend on a component kit.
- **Fold `form-ui` into `ui` and let `ui` depend on `forms`.** The dependency is
  acyclic and would work. Rejected because it inverts the intent — the component
  kit would then be unusable without the form model, and `<DInput>` is meant to be
  usable with a plain `v-model` (which is exactly what
  `playground/app/pages/forms.vue` demonstrates).
</content>
</invoke>
