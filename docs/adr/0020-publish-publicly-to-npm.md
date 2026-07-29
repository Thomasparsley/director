# 0020 — Publish the @director scope publicly to npm

Status: Accepted

Supersedes the registry half of [ADR-0003](0003-pnpm-workspace-changesets-private-scope.md).
The pnpm-workspace and Changesets halves of 0003 still stand.

## Context

ADR-0003 pointed the scope at GitHub Packages with `access: "restricted"`, and
marked it as a default rather than a commitment (*"adjust if you use another
registry"*). It also recorded that **the publish path was designed but never
exercised**: every package sat at `0.0.0`, `.changeset/` held only its config, and
consumers linked the checkout instead — which cost them a client that cannot build
without `../director` beside it.

Nothing had been published, so the cost of changing target was zero, and the
friction 0003 predicted — *"the private scope means consumers need an authenticated
`.npmrc`"* — was being paid on every consumer install for a product line whose
source is public on GitHub anyway.

## Decision

**The `@director/*` packages publish publicly to registry.npmjs.org.**

- `.npmrc` no longer sets `@director:registry` — the default registry is npm, and
  the file now carries only `shamefully-hoist`.
- Each package declares `publishConfig.access: "public"`; the GitHub-Packages
  `publishConfig.registry` line is gone. `.changeset/config.json` moves to
  `access: "public"` to match.
- **MIT**, with the licence text at the repo root and copied into each package (npm
  ships a package's own `LICENSE`, not the repo's).
- Each package carries the metadata an npm page is read through: `description`,
  `keywords`, `repository` (with `directory`), `homepage`, `bugs`, `author`,
  `engines`, and its own `README.md`.
- **`postinstall: nuxt prepare` is gone from every package**, renamed to
  `dev:prepare` and fanned out from the root `postinstall`. A published
  `postinstall` runs inside *every consumer's* `node_modules`, where `nuxt prepare`
  has no app to prepare and `nuxt` is only a peer dependency. It was harmless while
  nothing was published, and would have fired on the first install of the first
  release.
- **Releases are cut from a tag, not from a merge.** `.github/workflows/release.yml`
  fires on `v[0-9]+.[0-9]+.[0-9]+` and runs `changeset publish`, with npm provenance
  on so releases are attested to the workflow that built them. Versioning stays a
  deliberate local step (`pnpm version-packages`, commit, tag) rather than the
  Changesets bot's "Version Packages" PR: releasing is an explicit act here, and the
  tag is the record of it.
- The workflow refuses two footguns before it publishes: a tag whose commit is not
  an ancestor of `main` (anyone can push a tag from anywhere, and a publish cannot
  be undone after 72 hours), and a tag pushed while `.changeset/` still holds
  unreleased changesets (which means the manifests were never bumped).

## Consequences

- Consumers install with no auth and no `.npmrc`, which is the point: the layer
  chain is usable by anyone extending it, and the firesport-style
  "unbuildable without the sibling checkout" arrangement can end.
- The scope is a public commitment. A published version cannot be unpublished after
  72 hours, and names are permanent — the first `changeset publish` is the moment
  the `files` lists, the `exports` maps and the `#layers/...` import paths become a
  contract with strangers. `npm pack --dry-run` per package is the pre-flight.
- Publishing raw source (ADR-0001) publishes *all* of it: no build step means no
  minification and no dead-code elimination, and every file in `files` is readable
  on unpkg. That was already true internally; it is now true publicly.
- Provenance requires the release to run in CI with `id-token: write`. A local
  `pnpm release` still works, but publishes without attestation.
- **The tag number means less than it looks like it does.** The layers version
  independently (ADR-0003), so a release tag is a marker for "these packages went
  out together", not a version any single package carries; `changeset publish`
  decides what actually ships by diffing manifests against the registry. If that
  ambiguity ever costs more than it saves, the fix is Changesets `fixed` (lockstep
  versioning), which would make the tag exact — and would reverse the "a
  `@director/common` typo fix should not bump `@director/core`" call in ADR-0003.
  Not taken now.
- MIT means downstream forks are permitted and the warranty disclaimer is the whole
  of the liability position.

## Alternatives considered

- **Stay on GitHub Packages, publicly.** GitHub Packages has no anonymous read for
  npm packages — even public ones need a token — so "public" there would not have
  removed the friction that motivated the change.
- **npm with `access: "restricted"`.** Keeps the private-by-default posture on a
  registry consumers already authenticate to, but needs a paid npm org and leaves
  the auth friction in place. Rejected: the source is public regardless.
- **Publish under one package name with subpath exports.** Would collapse eight
  npm pages into one, but a Nuxt layer is addressed by package name in `extends`,
  and the layers are independently versioned by design (ADR-0003). Rejected.
