# @directorkit/core

Pre-assembled administration building blocks — the app shell and its navigation —
built on [`@directorkit/ui`](https://www.npmjs.com/package/@directorkit/ui). Extending
this layer gives you the component kit as well; apps customize by overriding the
layer, not by forking it.

## Install

```bash
npm install @directorkit/core
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ["@directorkit/core"],
});
```

```ts
// uno.config.ts — required, inherited from @directorkit/ui
export { default } from "@directorkit/ui/uno.config";
```

`@directorkit/core` is a **Nuxt layer**, not a built library: it ships raw source and
the consuming app's Vite compiles it. `nuxt`, `vue` and `vue-router` are peer
dependencies.

## Components

| Component | What it does |
| --- | --- |
| `<DAppShell>` | The admin frame: a `#left` rail, a `#header` and the default content slot. Layout only |
| `<DNavigation>` | Renders a section → group → item tree; resolves the active entry from the route |
| `<DNavigationEntry>`, `<DNavigationEntryBody>` | The single entry, split so a consumer can restyle the body without re-implementing the link |

```vue
<script setup lang="ts">
import { House, Users } from "@lucide/vue";

const collapsed = ref(false);

// Sections hold groups, groups hold items — each keyed. `icon` is a component,
// not a name: lucide icons are auto-imported, so a string could not be resolved.
const sections: Array<DNavigationSection> = [
  { key: "main", groups: [{ key: "overview", items: [{ label: "Dashboard", to: "/", icon: House }] }] },
  { key: "manage", groups: [{ key: "people", label: "Manage", items: [{ label: "Users", to: "/users", icon: Users, badge: "12" }] }] },
];
</script>

<template>
  <DAppShell :collapsed="collapsed">
    <template #left>
      <DNavigation :sections="sections" :collapsed="collapsed" tooltip />
    </template>
    <template #header>
      <!-- your page header -->
    </template>
    <NuxtPage />
  </DAppShell>
</template>
```

Items nest (`children`), gate themselves out of the tree (`skipIf`), and carry badges
or chips. Passing `collapsed` narrows the rail to icons, with labels becoming
tooltips and children becoming flyouts. For a single unlabelled group, `:items` is
shorthand for the full `:sections` tree.

`useNavigation(sections)` is the composable behind the component — the active item is
resolved once, centrally, rather than each entry deciding for itself (ADR-0016);
`useNavigationActive()` reads that result. `useIsDirector()` /
`useProvideIsDirector()` let a component tell whether it is rendering inside the
shell.

## Documentation

See the [repo's ADRs](https://github.com/Thomasparsley/director/tree/main/docs/adr),
in particular 0016 (AppShell is layout only).

## License

MIT © Tomáš Petržela
