<script setup lang="ts">
// <DFormInputNumber> — DInputNumber driven by a FormControl<number>.
import DFormField from "#layers/director-ui/app/components/formField.vue";
import DInputNumber from "#layers/director-ui/app/components/inputNumber.vue";

import type { BaseFormBindingProps } from "../types/props";
import { useFormFields } from "../composables/useFormFields";

interface Props extends BaseFormBindingProps<number> {
  readonly min?: number
  readonly max?: number
  readonly step?: number
  readonly formatOptions?: Intl.NumberFormatOptions
  readonly locale?: string
  readonly placeholder?: string
  readonly name?: string
}

const props = defineProps<Props>();

const { fieldValue, fieldError } = useFormFields(props.control);

function onBlur() {
  props.control.transform();
  props.control.validate();
}
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
    <DInputNumber
      v-model="fieldValue"
      :min
      :max
      :step
      :format-options="formatOptions"
      :locale
      :placeholder
      :name
      :disabled
      :required
      @blur="onBlur"
    />
  </DFormField>
</template>
