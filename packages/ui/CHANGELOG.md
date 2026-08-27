# @directorkit/ui

## 0.1.2

### Patch Changes

- 09af447: The UnoCSS scan pipeline no longer walks `node_modules`. The theme widens UnoCSS's
  default include list to plain `.ts`/`.js` — it has to, because our component class
  strings live in cva files rather than in templates — but that widening also handed the
  extractor every compiled dependency in the tree as if it were markup. Machine-generated
  JS is bracket soup, and the extractor reads it as arbitrary-value candidates: a consuming
  app was scanning ~2200 files in there and minting utilities out of loop variables, right
  down to `.p[i++]` and `.m[1]{margin:1}`. One of them was fatal. elkjs — a 1.6 MB
  GWT-compiled bundle that `@unovis` pulls in for graph layout — produced a candidate with
  an unbalanced bracket, so postcss could not parse the generated CSS and `nuxt build`
  failed outright, with an error pointing at `__uno.css` rather than at anything the app
  had written.

  Nothing out there was ever ours to style. Headless libraries carry no classes of their
  own, and the dependency `.vue` files that do — Nuxt's `error-404`/`error-500` — inline
  their entire stylesheet through `useHead` and render correctly without us. Verified
  against builds of both the playground and a consuming app: every utility that disappears
  is either that junk, those two self-contained error pages, or one class from
  `@vue/devtools-kit`.

  The exclude spares any path with an `@directorkit` segment, in both the flat and the pnpm
  store layouts. That carve-out is the point rather than a detail: when these packages are
  installed from npm instead of linked, our own cva files sit in `node_modules` too, and
  excluding them would ship precisely the unstyled components the widened include exists to
  prevent.

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

## 0.1.0

### Minor Changes

- 68dffe0: First public release. The `@directorkit/*` layers now publish to npm under the MIT
  license (ADR-0020): every package carries its own README and npm metadata, and the
  `postinstall: nuxt prepare` hook — which would have run inside every consumer's
  `node_modules` — is now a root-level `dev:prepare`.

### Patch Changes

- 4772a29: `<DInput>` now puts the caller's attributes on the input, not on the wrapper. The root is
  a positioning `div` for the affix slots, so by default every attribute passed to the
  component landed there — including `aria-label`, which on a `div` leaves the control with
  no accessible name at all. That is how a field ends up unlabelled to a screen reader while
  looking perfectly fine on screen.

  `class` and `style` deliberately stay on the wrapper: a caller writing `class="w-40"` is
  sizing the control's box, and moving that to the input would change the layout of every
  consumer. The split is explicit rather than a single `inheritAttrs` switch, because
  neither destination is right for both.

- Updated dependencies [68dffe0]
- Updated dependencies [68dffe0]
  - @directorkit/common@0.1.0
