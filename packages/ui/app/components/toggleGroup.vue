<script setup lang="ts" generic="T extends AcceptableValue | AcceptableValue[]">
// <DToggleGroup> — reka's ToggleGroupRoot wearing the segmented-control trough. Roving
// focus, the single/multiple model and the hidden form input all come from reka; this
// layer adds the glass and hands the size down to the items.
import { computed } from "vue";
import { ToggleGroupRoot, type AcceptableValue } from "reka-ui";

import type { DToggleGroupProps } from "./toggleGroup.types";
import { toggleGroupRootVariants } from "./toggleGroup.variants";
import { provideToggleGroupContext } from "./toggleGroup.context";

const props = withDefaults(defineProps<DToggleGroupProps>(), {
  type: "single",
  orientation: "horizontal",
  // Vue casts an absent boolean prop to false, so leaving these out wouldn't inherit reka's
  // defaults — it would forward `false` and quietly kill arrow-key navigation. Restate them.
  rovingFocus: true,
  loop: true,
});

// `type="single"` narrows T to one value, `type="multiple"` to an array — either way the
// caller's ref decides, so `v-model` stays typed at the call site.
const model = defineModel<T>();

provideToggleGroupContext({ size: computed(() => props.size) });
</script>

<template>
  <ToggleGroupRoot
    v-model="model"
    :type
    :disabled
    :name
    :required
    :orientation
    :loop
    :roving-focus="rovingFocus"
    :class="toggleGroupRootVariants({ orientation, disabled })"
  >
    <slot />
  </ToggleGroupRoot>
</template>
