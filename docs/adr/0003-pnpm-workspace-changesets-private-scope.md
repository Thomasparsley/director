# 0003 — pnpm workspace, Changesets, and the private @directorkit scope

Status: Accepted

## Context

Six packages that version and publish independently, developed together, consumed
by apps that are not in this repo. The scaffold commit (`4d8a644`) had to pick a
workspace tool, a versioning tool, and a publish target before any of it existed.

## Decision

**pnpm workspaces.** `pnpm-workspace.yaml` globs `packages/*` and `playground`;
the package manager is pinned in the repo (`packageManager: pnpm@11.9.0`,
`package.json:4`) so every checkout resolves identically. Root scripts are pure
fan-out — `lint` and `typecheck` are `pnpm -r --if-present`, `dev` filters to the
playground.

**Internal links are `workspace:*`.** Note how *little* that does here: layers
consume each other through Nuxt `extends`, not JS imports (ADR-0001), so the
dependency exists mainly to make the package resolvable from the consumer's
`node_modules`. Changesets rewrites `workspace:*` to a real range on publish
(`updateInternalDependencies: "patch"`).

**Changesets for versioning**, with `access: "restricted"` and the playground
ignored (`.changeset/config.json`). Publishing is `changeset publish` from the
root.

**GitHub Packages as the registry**, scoped: `.npmrc:2` sets
`@directorkit:registry=https://npm.pkg.github.com`, and every publishable package
restates it in `publishConfig.registry`. The `.npmrc` comment marks it as a
default, not a commitment: *"adjust if you use another registry"*.

**`shamefully-hoist=true`** (`.npmrc:5-6`), because *"Nuxt's module / auto-import
resolution expects a flat-ish node_modules. Hoist broadly to avoid 'cannot resolve
module' issues. Narrow later with public-hoist-pattern if desired."*

## Consequences

- Nothing has been published yet: every package sits at `version: 0.0.0` and
  `.changeset/` contains only `config.json` — no changeset has ever been
  recorded. Consumers therefore link the checkout instead (a consumer's own ADR
  documents doing precisely this, and paying for it: its client is unbuildable
  without `../director` checked out beside it). **The publish path is designed
  but unexercised**; the
  first `changeset publish` will be the first test of the `files` lists, the
  `exports` maps, and the registry auth.
- `shamefully-hoist` is a blunt instrument: it hides missing dependencies. A
  layer can import a package it never declared and it will resolve here, then
  fail in a consumer's tree. This is the flat-node_modules bargain, taken
  knowingly and marked for narrowing later.
- The private scope means consumers need an authenticated `.npmrc`. For an
  internal product line that is the intent, but it is friction that a public
  scope would not have.
- `pnpm lint` is currently a no-op: the root script fans out with
  `--if-present`, and **no package defines a `lint` script and no ESLint config
  exists anywhere in the repo.** The command is a placeholder for a decision not
  yet made.

## Alternatives considered

- **npm/yarn workspaces.** Would work; pnpm's strict, symlinked store is the
  reason `shamefully-hoist` is a deliberate opt-out rather than the default
  behaviour, and its `overrides` are what makes ADR-0004 enforceable across the
  whole graph.
- **A single version for all packages (fixed/linked in Changesets).** Simpler to
  reason about, and tempting given how tightly the layers are coupled. Rejected
  for now — `fixed: []` and `linked: []` — because a `@directorkit/common` typo fix
  should not bump `@directorkit/core`. Revisit if the versions drift far enough
  apart that compatible combinations stop being obvious.
</content>
</invoke>
