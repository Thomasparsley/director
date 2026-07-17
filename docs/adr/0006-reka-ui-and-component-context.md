# 0006 — reka-ui for behaviour, symbol-keyed context for compound components

Status: Accepted

## Context

An admin component kit needs the hard parts of accessible widgets: roving focus,
typeahead, popper positioning, focus trapping, hidden form inputs, `aria-*`
bookkeeping. Writing those is a multi-year project and getting them subtly wrong
is the norm.

Separately, compound components (`<DFormField>` wrapping a control,
`<DToggleGroup>` wrapping items) need to share state without the caller wiring it
by hand.

## Decision

### reka-ui owns behaviour; this layer adds the glass

`reka-ui` is an exact-pinned dependency (`2.9.8`) and the base of every
interactive component. The division is stated at `toggleGroup.vue:2-4`:

> `<DToggleGroup>` — reka's ToggleGroupRoot **wearing the segmented-control
> trough**. Roving focus, the single/multiple model and the hidden form input all
> come from reka; **this layer adds the glass** and hands the size down to the
> items.

Two consequences of building on it are documented at the call sites:

- *"Vue casts an absent boolean prop to false, so leaving these out wouldn't
  inherit reka's defaults — it would forward `false` and quietly kill arrow-key
  navigation. Restate them."* (`toggleGroup.vue:15-16`) — hence `rovingFocus: true,
  loop: true` in `withDefaults`.
- reka has no scoped popper contexts, so wrapping a `PopoverTrigger` in a
  `TooltipRoot` steals the anchor and floating-ui parks the popover off-screen
  (`packages/core/app/components/navigationEntry.vue:57-62`). The collapsed
  navigation flyout carries its own heading instead of a tooltip.

### Compound components share state through a module-private `Symbol` key

Each compound component gets a `foo.context.ts` exporting exactly two functions —
`provideFooContext(context)` and `useFooContext(props)` — over a key that is never
exported (`formField.context.ts:16`, `toggleGroup.context.ts:14`, both namespaced
`director:`).

`useFooContext(props)` **merges the child's own props with the injected context
and returns the merged computed**, so the child never branches on whether it has a
parent. Injection is always optional (`inject(key, null)`), so a control works
standalone.

`formField.context.ts:5-8` names the precedent:

> DFormField → control handshake, **the same trick Nuxt UI's FormField plays**:
> the wrapper provides id/invalid/size, and any control rendered in its default
> slot picks them up without the caller wiring `for`/`aria-*` by hand. Controls
> outside a field fall back to their own props, so the injection is always
> optional.

The merge rule is "child prop wins", with one deliberate exception
(`formField.context.ts:40-42`): *"`||` rather than `??`: Vue casts an absent
boolean prop to false, which must not shadow the field's error state."*

## Consequences

- Accessibility is inherited rather than authored. `<DToggleGroup>` gets roving
  focus and a hidden input for free; `<DFormField>` only has to provide the id.
- **reka's model is our model.** Its assumptions leak into our API — most
  sharply, `SelectRoot` treats an `undefined` `modelValue` as *absent* and drops
  into uncontrolled mode, which is one of the three failures behind ADR-0012.
- reka is **not stubbed in tests** — specs exercise the real thing. That is why
  the test setup has to stub `ResizeObserver` and the pointer-capture API, and
  why `attachTo: document.body` is needed for anything that teleports (ADR-0008).
- The context files are hand-rolled per component and near-identical. This is
  deliberate duplication over a shared factory: each one is ~30 lines, the merge
  rules differ per component, and `toggleGroup.context.ts:5-8` cites formField as
  precedent rather than importing from it.
- Note this does **not** use `@director/common`'s `utils/injection.ts`
  (`hasInjection` / `tryProvide`). That helper exists and is unused by the
  component kit — the context files import `provide`/`inject` from `vue`
  directly.
- Pinning reka exactly (`2.9.8`, like every UnoCSS package) means upgrades are
  deliberate. Given how much undocumented behaviour we depend on, that is the
  right default.

## Alternatives considered

- **Headless UI / Radix Vue directly.** reka-ui *is* the continuation of Radix
  Vue; the choice is effectively already made by the Vue ecosystem.
- **Write the primitives ourselves.** Rejected on cost, and because the failure
  mode is silent inaccessibility rather than a broken build.
- **A shared `createContext<T>()` factory in `common`.** Would remove ~20 lines
  of duplication per compound component. Rejected for now: the two existing
  contexts differ in their merge semantics, and the factory would have to be
  parameterised until it was longer than what it replaced. Revisit at the third
  or fourth context.
</content>
</invoke>
