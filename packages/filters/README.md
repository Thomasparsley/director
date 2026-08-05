# @directorkit/filters

Page-level filter state built on
[`@directorkit/forms`](https://www.npmjs.com/package/@directorkit/forms): **a filter is a
form group** whose data can be persisted to the URL query — per field, or as one
serialized param. Logic-only, no components.

## Install

```bash
npm install @directorkit/filters
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ["@directorkit/filters"],
});
```

`@directorkit/filters` is a **Nuxt layer**, not a built library: it ships raw source and
the consuming app's Vite compiles it. `nuxt`, `vue` and `vue-router` are peer
dependencies.

## Use it

`useFilters` takes the same record of controls you would hand `useFormGroup`, and
returns `{ form, data }` — the group itself, plus a computed of its plain values to
feed your query:

```ts
const people = useFilters(
  {
    search: useFormControl<string>(""),
    role: useFormControl<string>(""),
    active: useFormControl<boolean>(false),
  },
  {
    storage: { id: "people", query: true },
    // The route query is all strings — coerce it back on initialization.
    initializeTransform: query => ({
      search: typeof query.search === "string" ? query.search : "",
      role: typeof query.role === "string" ? query.role : "",
      active: query.active === "true",
    }),
  },
);

const filtered = computed(() => filter(PEOPLE, people.data.value));
```

Because the filter *is* a form group, everything from `@directorkit/forms` still
applies — transformers, validators, `patch()` — and the same `<DForm*>` components
from [`@directorkit/form-ui`](https://www.npmjs.com/package/@directorkit/form-ui) render it
(`people.form.controls.search`).

Storage is opt-in per filter, in one of two modes:

| `storage` | URL shape |
| --- | --- |
| `{ id, query: true }` | One query param per field — `?search=ada&role=admin` |
| `{ id, queryObject: true }` | The whole filter serialized into one param named `id` — good for deep or array-heavy filters |

`queryObject` round-trips through the UTF-8-safe base64 helpers in
`@directorkit/common`, so non-ASCII filter values survive a shared link, and it clears
its param on unmount unless you set `queryDestroy: false`. Enabling storage means
`useFilters` must run inside component setup.

## Documentation

See [ADR-0015](https://github.com/Thomasparsley/director/blob/main/docs/adr/0015-a-filter-is-a-formgroup.md)
for why a filter is modelled as a form group rather than its own abstraction.

## License

MIT © Tomáš Petržela
