# @director/ui

The component kit and the design tokens: auto-registered `<D*>` components built on
[reka-ui](https://reka-ui.com) for behaviour and [UnoCSS](https://unocss.dev) for
styling, plus `@nuxtjs/color-mode` and `nuxt-lucide-icons` riding along with the layer.

## Install

```bash
npm install @director/ui
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ["@director/ui"],
});
```

```ts
// uno.config.ts — REQUIRED, see below
export { default } from "@director/ui/uno.config";
```

`@director/ui` is a **Nuxt layer**, not a built library: it ships raw `.vue` source
and the consuming app's Vite compiles it. `nuxt` and `vue` are peer dependencies.

### Why the `uno.config.ts` re-export is mandatory

The palette *is* the UnoCSS theme, and a Nuxt layer cannot ship a Uno config
transitively — `@unocss/nuxt` only discovers a config at the app root. Every
consumer therefore re-exports ours from its own `uno.config.ts`. Skip this step and
the components render unstyled. (The modules themselves — Uno, color-mode, lucide —
*do* come with the layer; you declare none of them.)

## Components

Auto-registered with the `D` prefix, flat (`pathPrefix: false`):

`<DBadge>` `<DButton>` `<DButtonGroup>` `<DCard>` `<DChip>` `<DDateField>`
`<DDatePicker>` `<DEmpty>` `<DFormField>` `<DInput>` `<DInputNumber>` `<DKbd>`
`<DPinInput>` `<DSelect>` `<DSkeleton>` `<DSwitch>` `<DTimeField>` `<DToggle>`
`<DToggleGroup>` `<DToggleGroupItem>`

```vue
<template>
  <DCard>
    <DFormField label="Name">
      <DInput v-model="name" placeholder="Ada Lovelace" />
    </DFormField>
    <DButton variant="primary" @click="save">Save</DButton>
  </DCard>
</template>
```

Each component is four files — `.vue`, `.types.ts`, `.variants.ts` and `.spec.ts` —
so the variant matrix (built with `class-variance-authority`) is readable and
overridable on its own. Icons come from `nuxt-lucide-icons` with the `Icon` prefix
(`<IconCheck />`).

To bind these inputs to a form model instead of a plain `v-model`, add
[`@director/form-ui`](https://www.npmjs.com/package/@director/form-ui).

## Documentation

Design-token and component-authoring decisions are recorded in the
[repo's ADRs](https://github.com/Thomasparsley/director/tree/main/docs/adr) —
0005 (one component, four files), 0006 (reka-ui and context), 0007 (the palette).

## License

MIT © Tomáš Petržela
