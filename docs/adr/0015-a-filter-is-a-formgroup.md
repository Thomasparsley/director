# 0015 — A filter is a FormGroup with a storage backend

Status: Accepted

## Context

Every list page in an admin filters: a few controls, feeding a query, and the
result has to survive a reload and be shareable as a link. `@directorkit/filters`
(`49f88e3`) is the port of firesport's filters layer.

A filter panel is a form — controls with values, validation, reset. Building a
second state model for it would duplicate `@directorkit/forms` and then diverge from
it.

## Decision

**`useFilters` is `useFormGroup` plus optional persistence.** The whole composable
is 23 lines:

```ts
const form = useFormGroup(filter);
if (options?.storage) { useFiltersStorage(form, options); }
return { form, data: form.data };
```

`data` is a re-export of `form.data` — *"the value pages feed into their queries"*.
There is **no new state and no new reactivity**. Without `options.storage`,
`useFilters` is a rename of `useFormGroup`.

This is what forces the layer graph in ADR-0002: `filters` extends `forms` and
nothing else, which is only possible because `forms` has no components.

### Two query backends

- **`query`** — per-field mirroring. Init: `transform(route.query)` →
  `patch(query, { write: true })` — `write` is what keeps the form pristine after
  loading from the URL (ADR-0011). Write-back is throttled (500ms) and diffed with
  `makeDeepDiff`, then spread over `{ ...route.query }` so **unrelated query params
  survive**. `router.replace`, not `push` — filtering does not pollute history.
- **`queryObject`** — the whole filter as one serialized param under `options.id`.
  Its watcher is `immediate` *only* if the param was already present, so mounting a
  filter never spontaneously creates it. On unmount it removes its own param by
  default (`queryDestroy`).

Both register write-back inside `onMounted`, *"so the URL is only ever written on
the client"*.

### Serialization: JSON → base64 → URL-encode

`serializeQueryData` is *"JSON, base64 (UTF-8 safe), URL-encoded"*; the spec
asserts URL-safety concretely (`not.toMatch(/[/+=?&#]/)`).

The **UTF-8 safety is not incidental**. Bare `btoa("ž")` throws
`InvalidCharacterError` — btoa accepts only code points 0–255. So
`@directorkit/common`'s `utf8ToBase64` encodes to UTF-8 bytes with `TextEncoder`,
presents those bytes to `btoa` as latin1 characters, and `base64ToUtf8` reverses it
via `TextDecoder`. The consuming app is Czech: a filter containing "Plzeň" hits
this on day one. `base64.spec.ts` pins it with Czech text, emoji with skin-tone
modifiers and flags, CJK, a combining mark, and a differential oracle against
`Buffer.from(value, "utf8").toString("base64")`.

## Consequences

- Filters get validation, reset, transformers and the whole form vocabulary for
  free, and a filter panel binds with the same `<DForm*>` components as any other
  form.
- Deep-linking works: the URL is the state, unrelated params are preserved, and
  the back button is not filled with keystrokes.
- **The storage abstraction is a seam, not a plugin system.** The
  `storages/` directory and the `useFiltersStorage` dispatcher cost ~8 lines and
  make a future backend (localStorage, say) a local change. But
  `FilterStorageOptions` is **not** a discriminated union — it is flat booleans
  (`query?`, `queryObject?`), mutually exclusive only by `if`/`else` ordering, so
  `{ query: true, queryObject: true }` silently takes the `query` branch. A third
  backend means a third boolean and a third `else if`, and `queryDestroy` already
  leaks a query-only concern into the generic options type. Making it real means
  turning the options into a union first.
- **vue-router is in the public types**, not hidden behind the seam:
  `initializeTransform` is typed on `LocationQuery`, and `id` is documented as
  *"the query param name in `queryObject` mode"* — its meaning is already
  backend-specific.
- base64 is obfuscation, not encryption, and it makes the URL unreadable and
  un-editable by hand. That is the trade for putting arbitrary nested filter state
  in one param; the per-field `query` backend is the readable option.
- **Testing teardown needs a specific shape.** The specs mount a host component
  behind a `v-if` and hide it, rather than unmounting the app: *"Unmounting the
  whole app instead would reset vue-router to START_LOCATION before the teardown
  hooks run, which no real page ever sees."* Without that, the `queryDestroy`
  tests would read a blanked query and pass or fail for reasons unrelated to the
  code. Worth knowing before writing the next storage backend's tests.

## Alternatives considered

- **A standalone filter state model.** Independent of `forms`, no diamond. Rejected:
  it re-implements controls, validation and reset, and then a filter panel cannot
  use `<DFormSelect>`.
- **`localStorage` or a server-side saved view** as the default persistence.
  Neither is shareable as a link, which is the actual request behind "keep my
  filters". Both remain possible behind the seam.
- **Plain JSON in the query string, no base64.** Readable and hand-editable.
  Rejected: raw JSON in a URL is a thicket of escaping across the browser, the
  router and the server, and the `queryObject` mode exists precisely for state too
  nested to spell out per-field. Per-field `query` mode covers the readable case.
</content>
</invoke>
