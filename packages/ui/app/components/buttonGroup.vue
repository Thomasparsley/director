<script setup lang="ts">
// <DButtonGroup> — joins its children into one segmented control. Purely presentational:
// it styles whatever buttons (or selects, or a dropdown trigger) sit in its default slot,
// so a split button is just two <DButton>s side by side.
import type { DButtonGroupProps } from "./buttonGroup.types";
import { buttonGroupVariants } from "./buttonGroup.variants";

withDefaults(defineProps<DButtonGroupProps>(), {
  as: "div",
});
</script>

<template>
  <component
    :is="as"
    role="group"
    :aria-label="label"
    :class="buttonGroupVariants({ orientation })"
    v-bind="$attrs"
  >
    <slot />
  </component>
</template>
