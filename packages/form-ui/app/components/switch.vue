<script setup lang="ts">
// <DFormSwitch> — DSwitch driven by a FormControl<boolean>; a toggle has no meaningful
// blur, so it validates on every change.
import { computed } from "vue";

import DFormField from "#layers/director-ui/app/components/formField.vue";
import DSwitch from "#layers/director-ui/app/components/switch.vue";

import type { BaseFormBindingProps } from "../types/props";
import { useFormFields } from "../composables/useFormFields";

interface Props extends BaseFormBindingProps<boolean> {
  /** Text next to the toggle itself, distinct from the field label above it. */
  readonly switchLabel?: string
  readonly name?: string
}

const props = defineProps<Props>();

const { fieldValue, fieldError } = useFormFields(props.control);

const model = computed({
  get: () => fieldValue.value,
  set: (value: boolean) => {
    fieldValue.value = value;
    props.control.validate();
  },
});
</script>

<template>
  <DFormField
    :label
    :hint
    :description
    :help
    :required
    :disabled
    :size
    :error="fieldError?.message"
  >
    <DSwitch
      v-model="model"
      :label="switchLabel"
      :name
      :disabled
      :required
      :size="size === 'sm' ? 'sm' : 'md'"
    />
  </DFormField>
</template>
