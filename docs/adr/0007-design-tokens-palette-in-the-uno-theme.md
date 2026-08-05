# 0007 — Design tokens: the palette is the UnoCSS theme

Status: Accepted

## Context

The design language is ported from firesport, and it arrived with a full
CSS-variable token layer: `uno.variables.ts`, `uno.preflight.ts`, `vbg-`/`vtext-`
rules, and `cmp-*` shortcuts wrapping component recipes. Two systems then overlapped
— the token layer and UnoCSS's own theme — and an author had to know which one a
given colour lived in.

## Decision

**The palette is the UnoCSS theme.** `uno.config.ts:1-8` records the reversal:

> Color palette only (ported from firesport). The previous CSS-variable token
> layer (uno.variables.ts / uno.preflight.ts, the `vbg-`/`vtext-` rules and
> `cmp-*` shortcuts) has been removed — colors are exposed directly through the
> UnoCSS theme, e.g. `bg-primary-600`, `text-gray-900`, `dark:text-gray-50`.

The result is two tiers, and the split is on *how the value flips for dark mode*:

1. **Palette → theme.** `uno.colors.ts` is a flat `as const` of oklch scales
   (50→950) for `red`/`orange`/`green`/`blue`/`sky`/`gray`, plus semantic aliases
   in the theme: `primary→sky`, `secondary→gray`, `info→sky`, `success→green`,
   `warn→orange`, `error→red`. Used as ordinary utilities with an explicit `dark:`
   variant. (`gray` carries the only note: *"Mix of Tailwind gray (cool) and zinc
   (warm) — averaged L/C/H per step"*.)
2. **Color-mode-aware CSS variables**, re-introduced *inline* in `uno.config.ts:36-95`
   for the text/background ramp that must flip without a variant:
   > Color-mode aware tokens: [light-mode value, dark-mode value]. The same CSS
   > variable is declared under `:root` (light) and `.dark`, so `var(--vtext-*)` /
   > `var(--vbg-*)` flip automatically when the dark class toggles — no `dark:`
   > variant needed in markup.

   `vtext-1` is the strongest, climbing down to muted; the preflight emits both
   blocks from index 0/1 of each tuple.

**Light/dark is the `.dark` class**, from `@nuxtjs/color-mode` with
`classSuffix: ""` (`packages/ui/nuxt.config.ts:30-32`) — killing the default
`-mode` suffix so the class is `.dark`, which is what both Uno's `dark:` variant
and our preflight selector already expect.

**The app re-exports the config.** `@unocss/nuxt` resolves `uno.config.ts` from
the *app root*, not from layers — a Nuxt layer cannot ship a Uno config
transitively (ADR-0001). So `@directorkit/ui` exposes it (`"./uno.config"` in the
`exports` map) and every consumer writes four lines:

```ts
// app uno.config.ts
export { default } from "@directorkit/ui/uno.config";
```

**UnoCSS must scan `.ts`.** `uno.config.ts:59-70`: *"UnoCSS's default include list
scans .vue/.tsx/etc. but NOT plain .ts/.js. Our component class strings live in cva
files (e.g. button.variants.ts), so without this the layer components ship
unstyled."*

## Consequences

- One place to look for a colour. `bg-primary-600` needs no glossary, and the
  semantic aliases mean a palette swap is one line in the theme.
- **The two tiers must be chosen correctly, and the rule is not enforced.** Use a
  `dark:` variant in markup; use `vtext-*` in a cva string where doubling every
  rule with a `dark:` twin would be noise. Getting it wrong produces working code
  that is merely inconsistent — the worst kind of drift.
- The re-export is a mandatory step for every consumer, and forgetting it
  produces an *unstyled app*, not an error. `playground/uno.config.ts` exists
  partly to rehearse it: *"This is the same pattern firesport will use when it
  adopts @directorkit/ui."*
- The `content.pipeline.include` entry is not optional decoration — without it the
  published layer ships unstyled in a consumer's build. It is the second of the
  three taxes the ADR-0005 convention levies.
- All UnoCSS packages are exact-pinned to `66.7.4`. The preflight and the two
  regex rules poke at internals; a minor bump is a real change here.
- **The comment in `uno.config.ts:1-8` is now partly stale**: it says the
  `vbg-`/`vtext-` rules "have been removed", but they were re-introduced in that
  same file. Only the separate `uno.variables.ts` / `uno.preflight.ts` files and
  the `cmp-*` shortcuts are actually gone. (The README is stale in the same
  direction — it still points at `uno.colors/variables/preflight.ts`.)

## Alternatives considered

- **Keep the full CSS-variable token layer** (`vbg-`, `vtext-`, `cmp-*` for
  everything). Rejected: it duplicated the Uno theme, and the `cmp-*` shortcuts in
  particular competed directly with cva (ADR-0005) for the same job. The residual
  `vtext-`/`vbg-` ramp is the part that earns its keep.
- **Semantic tokens only** (`bg-surface`, `text-muted`, no raw scales). Cleaner in
  principle, but the kit is a component library — its consumers need the raw
  ramp, and firesport's design already speaks in scales.
- **Ship the Uno config from the layer.** Not possible; see above. This is a
  UnoCSS/Nuxt limitation, not a choice.
</content>
</invoke>
