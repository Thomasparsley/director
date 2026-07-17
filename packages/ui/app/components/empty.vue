<script setup lang="ts">
// <DEmpty> — the "nothing here yet" state: icon, title, description, a way out. Sized and
// surfaced like Nuxt UI's UEmpty, with `variant="naked"` for the common case of dropping it
// into a <DCard> or a table that already draws the box.
//
// The call to action is the `#actions` slot rather than an `actions: ButtonProps[]` prop:
// buttons here are usually a <DButton> wrapping a NuxtLink, and a prop array would have to
// re-describe half of DButton to get there.
import type { DEmptyProps } from "./empty.types";
import {
  emptyActionsVariants,
  emptyDescriptionVariants,
  emptyIconVariants,
  emptyTitleVariants,
  emptyVariants,
} from "./empty.variants";

withDefaults(defineProps<DEmptyProps>(), {
  as: "div",
  titleLevel: "h3",
});
</script>

<template>
  <component
    :is="as"
    :class="emptyVariants({ variant, size })"
    v-bind="$attrs"
  >
    <slot name="leading">
      <component
        :is="icon"
        v-if="icon"
        :class="emptyIconVariants({ variant, size })"
      />
    </slot>

    <component
      :is="titleLevel"
      v-if="$slots.title || title"
      :class="emptyTitleVariants({ variant, size })"
    >
      <slot name="title">{{ title }}</slot>
    </component>

    <p
      v-if="$slots.description || description"
      :class="emptyDescriptionVariants({ variant, size })"
    >
      <slot name="description">{{ description }}</slot>
    </p>

    <slot />

    <div
      v-if="$slots.actions"
      :class="emptyActionsVariants({ size })"
    >
      <slot name="actions" />
    </div>
  </component>
</template>
