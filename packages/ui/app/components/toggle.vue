<script setup lang="ts">
// <DToggle> — a two-state button on reka's Toggle, which renders a real <button
// aria-pressed> so keyboard and screen-reader behaviour come for free.
import { Toggle } from "reka-ui";

import type { DToggleProps } from "./toggle.types";
import { toggleVariants } from "./toggle.variants";

defineProps<DToggleProps>();

const model = defineModel<boolean>({ default: false });
</script>

<template>
  <Toggle
    :id
    v-model="model"
    :disabled
    :aria-label="label"
    :class="toggleVariants({ variant, size, square })"
    v-bind="$attrs"
  >
    <slot :pressed="model" />
  </Toggle>
</template>
