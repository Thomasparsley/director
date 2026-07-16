<script setup lang="ts">
// <DToggleGroupItem> — one segment of a <DToggleGroup>. reka renders a real
// <button aria-pressed> and tracks the on/off state against the group's model.
import { ToggleGroupItem } from "reka-ui";

import type { DToggleGroupItemProps } from "./toggleGroup.types";
import { toggleGroupItemVariants } from "./toggleGroup.variants";
import { useToggleGroupContext } from "./toggleGroup.context";

const props = defineProps<DToggleGroupItemProps>();

const { size } = useToggleGroupContext(props);
</script>

<template>
  <ToggleGroupItem
    :value
    :disabled
    :aria-label="label"
    :class="toggleGroupItemVariants({ size, square })"
  >
    <slot />
  </ToggleGroupItem>
</template>
