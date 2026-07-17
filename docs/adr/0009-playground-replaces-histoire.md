# 0009 — The playground replaces Histoire as the workbench

Status: Accepted

## Context

The scaffold (`4d8a644`) set up Histoire as the component workbench in
`@director/ui`: `histoire.config.ts`, `histoire.setup.ts`, a
`button.story.vue`, and `pnpm story` / `pnpm story:build` scripts.

The firesport import (`827d677`) replaced `button.vue` wholesale. Its story went
with it — along with the Histoire config, the setup file and both scripts — rather
than being rewritten. That was a decision made in passing; this ADR records it as
a decision.

## Decision

**The playground app is the workbench.** Histoire is gone; `pnpm dev` from the
root runs `playground`, which extends the whole layer chain and renders galleries
of every component.

The reason it is not coming back is structural, not incidental. Our components
depend on machinery that **only exists inside a Nuxt build** (ADR-0001):
`<DNavigation>` needs NuxtLink, `useRoute`, auto-imported lucide icons, and
layer-resolved `#layers/director-ui/...` type imports. A Histoire story for it
would have to stub all four — the same four things the unit tests stub, only now
in the thing whose whole job is to render the component *for real*. A workbench
that cannot run the components is not a workbench.

The playground stubs none of them, because it is a real Nuxt app.

**The playground is also the only integration check we have.** Unit tests cover
each layer in isolation with the layer boundaries mocked (ADR-0008); the
playground is the only artifact where the boundaries are real — real layer
resolution, real auto-imports, real Uno config discovery, real router. Two things
follow from that:

- It is **typechecked** (`vue-tsc --noEmit`, picked up by the root's recursive
  `typecheck`). This is the only place the assembled chain typechecks as one
  program.
- `playground/uno.config.ts` rehearses the consumer contract on purpose: *"This is
  the same pattern firesport will use when it adopts @director/ui"* (ADR-0007).
- `pages/[...slug].vue` exists purely as a fixture: *"Catch-all so every demo link
  in the sidebar resolves to a real route — that's what the navigation's active
  state and auto-expand are keyed off"*.

**Adding a layer is a five-part ritual, in one commit.** `ceb16f3` is the
template: `extends` entry + `workspace:*` dep + a demo page + a nav entry + the
README diagram. `3b15f65`/`ae905fe` and `49f88e3`/`ceb16f3` land seconds apart —
the library change and its playground proof are authored together and split only
along the package/app boundary.

## Consequences

- One place to look at a component, in the environment it actually ships into.
- **The integration check is a human running `pnpm dev` and looking.** The
  playground has no tests of its own — only `typecheck` is automated. That is the
  honest state: this is a demo that also happens to be the only real
  configuration, and nothing fails a build if a component renders wrong.
- The cost shows up as scaffolding in the unit tests: the ResizeObserver stub, the
  `#components` → RouterLink alias, the manual icon stubs, `attachTo:
  document.body`. Histoire would have supplied none of that either — but a
  component-per-story workbench would at least have isolated components. We gave
  that up for galleries.
- **`@director/filters` has no playground page** — it is in `extends` and in the
  deps since `ceb16f3`, but nothing under `playground/app/` calls `useFilters`. It
  is the only layer without a demo, and the ritual above is what it is missing.
- **The README still advertises Histoire and `pnpm story`** (a script that no
  longer exists), and still lists `uno.variables/preflight.ts`. `827d677` removed
  the code and the scripts and cleaned `.gitignore`, but missed the prose;
  `ceb16f3` edited the README two rows below without noticing. Worth fixing.

## Alternatives considered

- **Keep Histoire for `@director/ui` only**, where the components are mostly
  Nuxt-independent, and use the playground for `core`. Rejected: two workbenches,
  two sets of setup, and the boundary would move every time a `ui` component
  reached for an auto-imported icon — which `test/icons.ts` shows they already do.
- **Storybook.** Same structural objection as Histoire, at a higher setup cost.
- **Nuxt Devtools' component inspector.** Useful, but it inspects what a page
  renders; it does not give you a gallery of states.
</content>
</invoke>
