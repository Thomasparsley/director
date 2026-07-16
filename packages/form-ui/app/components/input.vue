<script setup lang="ts" generic="T extends string | number">
// <DFormInput> — DInput driven by a FormControl: value, error display, and
// blur → transform + validate.
import type { InputHTMLAttributes } from "vue";

import DFormField from "#layers/director-ui/app/components/formField.vue";
import DInput from "#layers/director-ui/app/components/input.vue";

import type { BaseFormBindingProps } from "../types/props";
import { useFormFields } from "../composables/useFormFields";

interface Props extends BaseFormBindingProps<T> {
  readonly type?: InputHTMLAttributes["type"]
  readonly placeholder?: string
  readonly autocomplete?: string
  readonly maxLength?: number
  readonly name?: string
}

type Emits = {
  enter: []
};

const props = defineProps<Props>();
const emits = defineEmits<Emits>();

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
    <DInput
      v-model="fieldValue"
      :type
      :name
      :placeholder
      :autocomplete
      :max-length="maxLength"
      :disabled
      :required
      @blur="onBlur"
      @enter="emits('enter')"
    >
      <template
        v-if="$slots.leading"
        #leading
      >
        <slot name="leading" />
      </template>
      <template
        v-if="$slots.trailing"
        #trailing
      >
        <slot name="trailing" />
      </template>
    </DInput>
  </DFormField>
</template>
