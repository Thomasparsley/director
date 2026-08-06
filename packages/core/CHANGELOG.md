# @directorkit/core

## 0.1.1

### Patch Changes

- No code changes — this release fixes three things about the published artifacts that
  0.1.0 got wrong, none of which could be corrected in place.

  **Internal dependencies are caret ranges instead of exact pins.** 0.1.0 declared
  `"@directorkit/common": "0.1.0"`, so a consumer holding two layers from different
  releases would install two copies of `common` — and two Nuxt layers both named
  `director-common` then compete for the same `#layers/director-common` alias. They now
  resolve as `^0.1.1` and dedupe across the 0.1.x line.

  **Packages are published with provenance.** 0.1.0 shipped unattested: the release
  workflow set `NPM_CONFIG_PROVENANCE`, which pnpm does not forward to the npm CLI, so
  the setting did nothing and nobody noticed until the registry was checked afterwards.
  It now lives in each package's `publishConfig`, which pnpm reads directly.

  **READMEs appear on the npm package pages.** They shipped inside the 0.1.0 tarballs but
  never reached the registry metadata that npmjs.com renders from, because pnpm stopped
  sending it — a regression pnpm fixed in 11.13. The repo's pnpm floor moved to 11.20.

- Updated dependencies
  - @directorkit/common@0.1.1
  - @directorkit/ui@0.1.1

## 0.1.0

### Minor Changes

- 68dffe0: First public release. The `@directorkit/*` layers now publish to npm under the MIT
  license (ADR-0020): every package carries its own README and npm metadata, and the
  `postinstall: nuxt prepare` hook — which would have run inside every consumer's
  `node_modules` — is now a root-level `dev:prepare`.

### Patch Changes

- Updated dependencies [68dffe0]
- Updated dependencies [4772a29]
- Updated dependencies [68dffe0]
  - @directorkit/common@0.1.0
  - @directorkit/ui@0.1.0
