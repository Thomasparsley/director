<script setup lang="ts">
// <DFormPinInput> — DPinInput driven by a FormControl<string>: the control holds the joined
// code ("12345"), the cells edit it character by character. Validates when the code is
// complete and on blur.
import { computed } from "vue";

import DFormField from "#layers/director-ui/app/components/formField.vue";
import DPinInput from "#layers/director-ui/app/components/pinInput.vue";

import type { BaseFormBindingProps } from "../types/props";
import { useFormFields } from "../composables/useFormFields";

interface Props extends BaseFormBindingProps<string> {
  readonly length?: number
  readonly otp?: boolean
  readonly mask?: boolean
  readonly placeholder?: string
  readonly name?: string
}

type Emits = {
  complete: [value: string]
};

const props = withDefaults(defineProps<Props>(), {
  length: 5,
});
const emits = defineEmits<Emits>();

const { fieldValue, fieldError } = useFormFields(props.control);

const cells = computed<Array<string>>({
  get: () => (fieldValue.value ?? "").split(""),
  set: (value) => {
    fieldValue.value = value.join("");
  },
});

function onComplete(value: Array<string>) {
  // reka also fires complete on mount while nothing is filled — not a completion.
  if (value.length === 0) {
    return;
  }

  props.control.validate();
  emits("complete", value.join(""));
}

function onBlur() {
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
    <DPinInput
      v-model="cells"
      :length
      :otp
      :mask
      :placeholder
      :name
      :disabled
      :required
      @complete="onComplete"
      @blur="onBlur"
    />
  </DFormField>
</template>
