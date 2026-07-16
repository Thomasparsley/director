<script setup lang="ts">
// <DSwitch> — a labelled toggle on reka's SwitchRoot, which renders a real <button
// role="switch"> so keyboard and screen-reader behaviour come for free.
import { SwitchRoot, SwitchThumb } from "reka-ui";

import type { DSwitchProps } from "./switch.types";
import { switchThumbVariants, switchTrackVariants } from "./switch.variants";
import { useFormFieldContext } from "./formField.context";

const props = defineProps<DSwitchProps>();

const { id, invalid } = useFormFieldContext(props);

const model = defineModel<boolean>({ default: false });
</script>

<template>
  <label
    class=":uno: inline-flex cursor-pointer select-none items-center gap-2"
    :class="{ ':uno: cursor-not-allowed opacity-50': disabled }"
  >
    <SwitchRoot
      :id
      v-model="model"
      :name
      :disabled
      :required
      :aria-invalid="invalid || undefined"
      :class="switchTrackVariants({ size, invalid })"
    >
      <SwitchThumb :class="switchThumbVariants({ size })" />
    </SwitchRoot>

    <span
      v-if="label || $slots.default"
      class=":uno: text-sm vtext-2"
    >
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>
