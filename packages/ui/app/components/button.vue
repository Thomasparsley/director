<script setup lang="ts">
import type { DButtonProps } from "./button.types";
import { buttonStyleVariants } from "./button.variants";

withDefaults(defineProps<DButtonProps>(), {
  as: "button",
  type: undefined,
});
</script>

<template>
  <component
    :is="as"
    :class="buttonStyleVariants({ variant, size, color })"
    :type
    :disabled
    v-bind="$attrs"
  >
    <slot />
  </component>
</template>
