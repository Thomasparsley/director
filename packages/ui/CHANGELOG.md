# @directorkit/ui

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
