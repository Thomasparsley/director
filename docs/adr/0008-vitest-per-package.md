# 0008 — Vitest per package, with the layer aliases re-declared by hand

Status: Accepted

## Context

`568d365` added the test infrastructure. The problem it had to solve: the layers
resolve each other through machinery that **only exists inside a Nuxt build** —
`#layers/*` aliases derived from each layer's `$meta.name`, auto-imports, and
`#components`. A plain Vitest run has none of it.

The options were to run tests inside Nuxt (`@nuxt/test-utils`, a real Nuxt
environment per suite) or to run plain Vitest and re-supply the few pieces the
code actually touches.

## Decision

One `vitest.config.ts` per package, plain Vitest + `@vitejs/plugin-vue` +
`happy-dom`, no Nuxt. Specs are **colocated** with the code
(`include: ["app/**/*.spec.ts"]`), not in a `test/` tree.

**The `#layers/*` aliases are re-declared by hand in each package**, only as far as
that package reaches: forms declares 1, filters and ui 2, form-ui 4. Each package
aliases its siblings *and itself* (`"#layers/director-ui": new URL(".")`), and the
alias names must match the `$meta.name` in the corresponding `nuxt.config.ts`.

**What has to be stubbed** — each stub names the reka trigger that requires it:

- `packages/ui/test/setup.ts` — `ResizeObserver` (*"reka-ui's floating primitives
  observe their trigger/content on mount. happy-dom ships no `ResizeObserver`, so
  without this stub any component that mounts a popper throws"*) and the
  pointer-capture API (*"reka's SelectTrigger releases pointer capture in its
  pointerdown handler; happy-dom elements don't implement the pointer-capture
  API"*).
- `packages/ui/test/icons.ts` — opt-in stubs standing in for the auto-imported
  lucide icons, rendering `<svg data-icon="...">` so they are assertable.
- `packages/core/vitest.config.ts:13-15` — a `#components` alias, because *"Nuxt's
  virtual component registry does not exist outside a Nuxt build. The stub maps
  NuxtLink onto RouterLink, which is what NuxtLink renders to for internal routes
  anyway."*
- `attachTo: document.body` wherever content teleports (selects, popovers).

**reka-ui itself is never stubbed.** Specs exercise the real component; the stubs
above exist precisely *because* the real thing runs.

**Specs assert in two tiers** (ADR-0005): a `describe` calling the cva function
directly and asserting on the class string, and a `describe` that mounts and
asserts behaviour and the DOM contract only. Classes are never asserted by
scraping rendered markup.

Test names read as statements of intent, not implementation — *"raises a white
pill only when on"*, *"sits one step under the control scale, which the root's
padding adds back"* — the latter encoding a layout invariant that would otherwise
live only in two unrelated numbers.

Composables that register lifecycle hooks are driven through a throwaway host
component rather than called bare (`packages/filters/app/composables/useFilters.spec.ts:36-43`,
`packages/core/test/mount.ts`) — see ADR-0015 for the unmount subtlety that forces
its exact shape.

## Consequences

- Tests are fast and debuggable — no Nuxt build per suite — and a spec sits next
  to the file it tests.
- **The alias maps are duplicated and can drift.** They are hand-maintained
  mirrors of what Nuxt would generate; add a layer, and every downstream
  package's `vitest.config.ts` needs the entry. Nothing checks that they agree
  with the `$meta.name` they mirror.
- We test the *code*, not the *wiring*. Auto-import resolution, real layer merge
  order, `#components`, Uno discovery and NuxtLink are all stubbed or absent — so
  none of them are covered here. That gap is deliberate and is what the playground
  is for (ADR-0009).
- The stub list grows with reka's internals. Each entry is a small bet that
  happy-dom's gap won't move.
- **`packages/common` has a `test` script and four specs but no
  `vitest.config.ts`** — no alias map and no `app/**` include, so it runs on
  Vitest's defaults. Relatedly, `common/app/utils/injection.ts` relies on Nuxt
  auto-imports (it imports nothing) and is untestable as written under bare
  Vitest — and has no spec. Worth closing.

## Alternatives considered

- **`@nuxt/test-utils` with a real Nuxt environment.** Would delete every stub
  and every hand-written alias, and would test the wiring too. Rejected on speed:
  it means a Nuxt build per suite, for a repo whose tests are overwhelmingly
  about a form model and cva strings — neither of which needs Nuxt at all
  (`@director/forms` and `@director/filters` have no components).
- **A shared root Vitest config with a workspace project list.** Would centralise
  the alias map. Rejected for now because each package must remain independently
  runnable (`pnpm -r test`) and publishable; revisit if the drift bites.
</content>
</invoke>
