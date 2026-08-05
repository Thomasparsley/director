---
"@directorkit/ui": patch
---

`<DInput>` now puts the caller's attributes on the input, not on the wrapper. The root is
a positioning `div` for the affix slots, so by default every attribute passed to the
component landed there — including `aria-label`, which on a `div` leaves the control with
no accessible name at all. That is how a field ends up unlabelled to a screen reader while
looking perfectly fine on screen.

`class` and `style` deliberately stay on the wrapper: a caller writing `class="w-40"` is
sizing the control's box, and moving that to the input would change the layout of every
consumer. The split is explicit rather than a single `inheritAttrs` switch, because
neither destination is right for both.
