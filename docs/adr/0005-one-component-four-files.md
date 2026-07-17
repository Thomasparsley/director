# 0005 — One component, four files

Status: Accepted

## Context

The scaffold (`4d8a644`) put button's cva recipe in `app/utils/cva/button.ts` — a
by-kind folder — with the props declared inline in `button.vue`. The firesport
import (`827d677`) deleted that file along with the button it described.
`b6d8301` re-landed the classes **colocated with the component** and split the
props out at the same time ("split button into types/variants"); badge, chip and
skeleton arrived in that commit already conforming, and every component since has
followed.

## Decision

A component is a set of colocated files sharing one basename, in a single flat
`app/components/` directory (no subdirectories — `pathPrefix: false` means nesting
would not affect the name anyway):

| file | role |
| --- | --- |
| `foo.vue` | template and wiring only — **no class strings** |
| `foo.types.ts` | `DFooProps` plus the exported variant unions |
| `foo.variants.ts` | the cva recipe |
| `foo.spec.ts` | tests both the cva function and the mounted component |
| `foo.context.ts` | provide/inject, for compound components only (ADR-0006) |

The quartet is *as needed*, not mandatory: `skeleton` has no `.variants.ts`, and
`kbd` adds a fifth kind, `kbd.keys.ts`, for its platform glyph table.

### The cva recipe is the single source of truth for the types

Props are derived *from* the variants, never duplicated
(`packages/ui/app/components/button.types.ts:1-7`):

```ts
import type { buttonStyleVariants } from "./button.variants";
type ButtonStyleParameters = NonNullable<Parameters<typeof buttonStyleVariants>[0]>;
export type ButtonVariant = ButtonStyleParameters["variant"];
```

Add a key to the cva object and the prop union widens automatically. The
dependency runs `.vue` → `.types` → `.variants`, one direction only.

`button.vue` is what falls out: 21 lines, `withDefaults(defineProps<DButtonProps>())`
and `:class="buttonStyleVariants({ variant, size, color })"`.

### Shared recipes live in a `*.variants.ts` of their own

`control.variants.ts:3-6` owns the control recipe for every form input — *"One
place owns the macOS 'liquid glass' control recipe … and the size scale, so the
individual components stay thin, the way Nuxt UI components share a common
theme."*

## Consequences

- **Classes are unit-testable without a DOM.** Specs call the cva function
  directly and assert on the returned string, then mount separately to assert
  behaviour (ADR-0008). Nothing has to scrape rendered markup for a class name.
- **This convention has a config tax, paid in three places**, and it is worth
  naming as one cost rather than three accidents:
  1. Every SFC now does a cross-file `import type`, which is the exact
     `@vue/compiler-sfc` path that needs `ts.sys` — hence the TypeScript 6
     override (ADR-0004).
  2. Class strings now live in `.ts` files, which UnoCSS's default pipeline does
     not scan — hence `content.pipeline.include` (ADR-0007).
  3. `uno.config.ts` / `uno.colors.ts` run in Node, not the app — hence a separate
     `tsconfig.uno.json` project.
- Four files per component is more to open and more to move. The payoff is that
  `foo.vue` reads as structure and `foo.variants.ts` reads as design, and neither
  is buried in the other.
- Two conventions in the recipes are load-bearing and easy to break:
  - Class strings are prefixed `:uno:` so the extractor finds them in a `.ts`
    file.
  - *"arbitrary-value utilities (`shadow-[...rgba(...)...]`) stay OUTSIDE variant
    groups — the parens inside the brackets would close a `dark:(...)` group
    early"* (`button.variants.ts:3-4`, repeated at `control.variants.ts:8-9`). A
    real interaction bug between `transformerVariantGroup` and Uno's
    arbitrary-value syntax, documented at both sites because it will bite again.
- Colour is expressed as empty strings in `variants.color` and filled only by
  `compoundVariants`, so `color` applies only to `variant: "default"` — an
  invariant asserted directly in `button.spec.ts:25-30`.

## Alternatives considered

- **Everything in the SFC.** Fewest files; drops the TS 6 pin and the Uno include
  entirely. Rejected: the class strings are the bulk of a component here, and
  they become untestable and unshareable (there would be no place for
  `control.variants.ts`).
- **By-kind folders (`utils/cva/button.ts`).** The scaffold's shape. Rejected on
  re-landing: it separates the two files most often edited together, and scales
  badly — one `cva/` directory mirroring the whole component list.
- **Tailwind-style class strings inline in the template.** Same problem as the
  first option, plus the variant matrix (`variant × color × size` with compound
  rules) is not expressible without cva.
</content>
</invoke>
