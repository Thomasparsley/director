<script setup lang="ts">
import { computed, useSlots } from "vue";

import type { DChipProps } from "./chip.types";
import { chipStyleVariants } from "./chip.variants";

const props = withDefaults(defineProps<DChipProps>(), {
  show: true,
});

const slots = useSlots();

// With children, the chip is pinned to the corner of what it wraps (e.g. a nav icon in the
// collapsed rail). Standalone, it just sits inline in the flow (e.g. next to a nav label).
const isOverlay = computed(() => Boolean(slots.default));

const hasText = computed(() => props.text !== undefined && props.text !== "");
</script>

<template>
  <span :class="isOverlay ? ':uno: relative inline-flex' : ':uno: inline-flex'">
    <slot />

    <span
      v-if="show"
      :class="chipStyleVariants({ color, size, text: hasText, overlay: isOverlay })"
    >{{ text }}</span>
  </span>
</template>
