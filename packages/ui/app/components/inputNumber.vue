<script setup lang="ts">
// <DInputNumber> — reka's NumberField: locale-aware formatting/parsing plus −/+ steppers
// with press-and-hold, wheel and arrow-key support.
import {
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldRoot,
} from "reka-ui";

import type { DInputNumberProps } from "./inputNumber.types";
import { controlFrameVariants } from "./control.variants";
import { inputNumberStepperVariants } from "./inputNumber.variants";
import { useFormFieldContext } from "./formField.context";

type Emits = {
  blur: []
};

const props = defineProps<DInputNumberProps>();
const emits = defineEmits<Emits>();

const { id, invalid, size } = useFormFieldContext(props);

const model = defineModel<number>();
</script>

<template>
  <NumberFieldRoot
    :id
    v-model="model"
    :min
    :max
    :step
    :format-options="formatOptions"
    :locale
    :name
    :disabled
    :required
    :class="[controlFrameVariants({ size, invalid }), ':uno: gap-1 !px-1']"
  >
    <NumberFieldDecrement :class="inputNumberStepperVariants({ size })">
      <IconMinus class=":uno: h-3.5 w-3.5" />
    </NumberFieldDecrement>

    <NumberFieldInput
      :placeholder
      :aria-invalid="invalid || undefined"
      class=":uno: w-full min-w-0 bg-transparent text-center outline-none tabular-nums placeholder:text-gray-400 disabled:cursor-not-allowed dark:placeholder:text-gray-500"
      @blur="emits('blur')"
    />

    <NumberFieldIncrement :class="inputNumberStepperVariants({ size })">
      <IconPlus class=":uno: h-3.5 w-3.5" />
    </NumberFieldIncrement>
  </NumberFieldRoot>
</template>
