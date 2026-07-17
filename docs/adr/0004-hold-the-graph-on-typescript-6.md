# 0004 — Hold the whole graph on TypeScript 6

Status: Accepted

## Context

npm's `latest` tag for `typescript` is **7**, so a default install — or any
lockfile refresh — gets TS 7. TS 7 is the native (Go) rewrite: it exports only
`lib/version.cjs`, with no `ts.sys` and no classic compiler API.

`@vue/compiler-sfc` `require()`s typescript and uses `ts.sys` as its filesystem to
resolve cross-file `import type`. Every component in this repo does exactly that —
`button.vue` imports its props type from `./button.types` — because that is the
authoring convention (ADR-0005). Under TS 7, **every SFC in the repo** fails with
*"No fs option provided to compileScript in a non-Node environment"*.

This repo was on 6.0.3 only by lockfile inertia: typescript was not declared in
any `package.json`, so the next refresh would have broken every component.

## Decision

Hold the entire graph on TypeScript 6 with a `pnpm.overrides` entry in
`pnpm-workspace.yaml` (where pnpm 11 reads its settings):

```yaml
overrides:
  typescript: ^6.0.3
```

and declare `typescript: ^6.0.3` as a devDependency in the packages that run
`vue-tsc`.

**A devDependency alone is not enough.** pnpm hoists a transitively-resolved TS 7
into `.pnpm/node_modules`, which `@vue/compiler-sfc` finds *first* when walking
up. Only the override holds the whole graph.

**A range, not an exact pin.** `^6.0.3` tracks the latest 6.x automatically, and
`^6` cannot reach 7 — which is the only thing that actually matters here.

Revisit when `@vue/compiler-sfc` supports TS 7 (it needs an `fs` option or a
TS-7-compatible resolver); at that point the override can be dropped.

## Consequences

- **This pin is shared with consumers, and neither side can move alone.** otlpobs
  carries the same override for the same reason (otlpobs ADR-0014): it compiles
  our SFCs from source (ADR-0001), so *its* TypeScript is what runs *our*
  `compiler-sfc`. Both repos have to stay off TS 7 for either to build.
- The convention in ADR-0005 is what makes this load-bearing. A repo whose SFCs
  declared their props inline would never touch the `ts.sys` path. We chose the
  split deliberately and this is part of its price — see also ADR-0007, where the
  same convention forces UnoCSS to scan `.ts` files.
- It is a **build-time** pin only. A version skew between this repo's TypeScript
  and a consumer's would be harmless in itself — TypeScript is a compiler, not a
  shared runtime instance (unlike Vue, where a second physical copy is fatal).
- We are pinned behind the ecosystem's default and will drift further the longer
  TS 7 is `latest`. The override is a dam, and it needs the comment on it
  (`pnpm-workspace.yaml`) to stay explicable.

## Alternatives considered

- **An exact pin (`6.0.3`).** Rejected: it buys nothing over `^6` — the failure
  mode is the 6→7 boundary, not a 6.x patch — and it would need manual bumps.
- **Declare `typescript` as a devDependency everywhere and skip the override.**
  Tried implicitly; does not work, because of the pnpm hoisting path described
  above.
- **Move off `@vue/compiler-sfc`'s type resolution** by declaring props inline in
  every SFC. That would drop the pin, at the cost of the whole authoring
  convention (ADR-0005) and the cva-as-source-of-truth typing that comes with it.
  Not worth it to avoid one config entry.
</content>
</invoke>
