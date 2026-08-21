---
"@directorkit/ui": patch
---

The UnoCSS scan pipeline no longer walks `node_modules`. The theme widens UnoCSS's
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
