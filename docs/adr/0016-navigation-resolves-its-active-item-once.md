# 0016 — AppShell is layout only; navigation resolves its active item once, at the root

Status: Accepted

## Context

`3b15f65` is where `@directorkit/core` stopped being a layer-chain smoke test and
became a product. The shell it replaced said so itself:

> Placeholder admin shell to seed @directorkit/core and demonstrate the layer chain
> (core → ui → common). **Replace with the real administration building blocks.**

It took a `title?: string` prop, rendered `min-h-screen`, and had one slot. The
rebuild landed `<DAppShell>` and `<DNavigation>` together — 13 files, ~1880 lines,
of which ~1040 are tests.

## Decision

### The shell owns geometry, and nothing else

`appShell.vue` is 45 lines with zero logic. Its only prop is `collapsed?: boolean`.
Two changes from the placeholder carry the decision:

- **`title` became a `#header` slot.** A title prop is a guess about what goes in a
  header; a slot is not. The shell became a layout primitive rather than a page
  template.
- **`min-h-screen` became `h-svh` + `of-hidden`**, with scrolling moved to an inner
  container. The old shell scrolled the document; pinning to the viewport is what
  makes a fixed rail and a persistent header possible at all.

**The shell knows nothing about navigation.** It owns the rail width, the card and
the scroll containers; the rail's contents are slot-driven. `collapsed` is
**app-owned** — the app passes the same flag to `<DAppShell>` and to
`<DNavigation>` independently, which `appShell.types.ts:3-5` documents ("Pair with
`<DNavigation :collapsed>` inside the `left` slot").

### Active state is computed once at the root and injected

`useNavigation.ts:74-81` states the problem:

> "does this path match the route?" cannot be answered in isolation: on
> `/leagues/mine`, a prefix match makes both `/leagues` and `/leagues/mine` look
> active. **Only the longest match wins, and that needs the whole tree.**

So `activePath` computes one winner for the whole tree — the longest item path the
current route sits under — `provide`s it under a symbol key, and each entry merely
compares itself against it. `/` is special-cased to an exact match, since it
prefix-matches every route. `useResolvePath` wraps `router.resolve` in try/catch:
*"An unresolvable target … must not take the whole sidebar down with it."*

### Expansion is derived, then owned by the user

Two-stage, and the second stage is the decision. `openValues` *derives* which
groups must be open (explicitly `defaultOpen`, or containing the active item). The
actual open state is a separate ref, and the watcher **only ever unions in** new
values:

> then owned by the user: we only ever add to it, so navigating never yanks open a
> branch the user deliberately closed.

### The tree is data, and the data carries the permissions

Three levels — section → group → item, items recursive — and **every level carries
`skipIf`**, typed `boolean | Ref<boolean>`. Filtering is recursive and also drops
groups and sections that emptied out: *"A group whose items were all skipped would
otherwise render as a bare heading."*

Two conventions in the item type: `icon` is a `Component`, not a string
(`nuxt-lucide-icons` auto-imports rather than globally registers, so a string has
nothing to resolve against), and `label` is already translated — *"This layer is
i18n-agnostic — translate before you pass it in."*

## Consequences

- The shell composes with anything. It has no opinion about what a header
  contains, and `<DNavigation>` is one option in the `left` slot, not a
  requirement.
- Active state is correct for nested routes by construction, and an entry cannot
  disagree with its siblings — there is one winner, computed in one place.
- **Navigating never fights the user.** The union-only rule means auto-expand is a
  floor, not a setting; the cost is that a branch the user opened stays open
  forever, since nothing ever removes from that ref.
- `provide`/`inject` for active state means an entry cannot be rendered outside a
  `<DNavigation>` — acceptable, since it is not exported for standalone use — and
  `useNavigation` cannot use its own `useNavigationActive()` for
  `hasActiveDescendant`, because inject reads the *parent* chain. It builds
  matchers from `activePath` directly instead. A subtlety that will trip the next
  person to touch it.
- The collapsed rail cannot use a tooltip on parent items — reka has no scoped
  popper contexts, so a `TooltipRoot` around a `PopoverTrigger` steals the anchor
  and floating-ui parks the popover off-screen (ADR-0006). The flyout carries its
  own heading instead.
- `skipIf` accepting a `Ref` means permissions can arrive late without
  reconstructing the tree — the common case when they come from a fetch.
- **`useDirector` is a seam, not a feature.** It is 12 lines providing a single
  `isDirector` boolean from `<DAppShell>`, and nothing consumes it outside its own
  test. It is here so a component can tell whether it is inside a Director shell;
  the name promises considerably more than the code delivers, and it should either
  grow or go.

## Alternatives considered

- **Per-item active matching** (each entry asks "am I active?"). The obvious
  design, and wrong: without the whole tree there is no way to know a longer match
  exists, so every ancestor of the active route highlights.
- **Prop-drilling the active path** instead of provide/inject. Explicit, but the
  tree is recursive and arbitrarily deep — every level would forward a prop it does
  not use.
- **Open state fully derived from the route** (no user-owned ref). One source of
  truth, and it re-opens a branch the user just closed on every navigation.
- **A `<DAppShell>` that renders navigation from a `navigation` prop.** Fewer
  moving parts for the common case. Rejected: it welds the two components together
  and makes the shell useless to anyone who wants a different rail.
</content>
</invoke>
