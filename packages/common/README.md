# @director/common

The base of the `@director/*` layer chain: shared utils, composables and types.
No components, no modules, no opinions about UI — every other `@director` layer
extends this one, and an app can extend it directly for the types alone.

## Install

```bash
npm install @director/common
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ["@director/common"],
});
```

`@director/common` is a **Nuxt layer**, not a built library: it ships raw source
and the consuming app's Vite compiles it. `nuxt` and `vue` are peer dependencies.

## What is in it

Everything below is auto-imported by Nuxt once the layer is extended.

| | |
| --- | --- |
| `useMaybeRef(value)` | Normalize a `MaybeRef<T>` into a real `Ref<T>` |
| `utf8ToBase64` / `base64ToUtf8` | Base64 that survives non-ASCII (plain `btoa` does not) |
| `makeDeepDiff(a, b)` | Deep diff of two objects — the primitive behind partial API updates |
| `isEmail(value)` | Email shape check, shared with the forms validators |
| `hasInjection(key)`, `tryProvide(key, fn)` | Provide/inject guards for optional component context |
| `lerp`, `toPercentage`, `getRandomIntBetween` | Small math helpers |

Types are importable from `#layers/director-common/app/types/*` — `Result<T, E>`,
`Optional<T>`, `AllowNull<T, Nullable>`, `DeepPartial<T>`, `MaybeRef<T, S>`,
`Promiseable<T>`, `LazyFn<T>`, `Dictionary<K, V>`, `KeyValue<K, V>`, `DayOfWeek`,
and the component helpers `ComponentLoader` / `EmitsToEvents<T>`. `Result` in
particular is the repo-wide convention for fallible operations:
`{ success: true, value }` or `{ success: false, error }`.

## Documentation

The full architecture — the layer graph, why these ship as layers and not a built
library — lives in the [repo's ADRs](https://github.com/Thomasparsley/director/tree/main/docs/adr).

## License

MIT © Tomáš Petržela
