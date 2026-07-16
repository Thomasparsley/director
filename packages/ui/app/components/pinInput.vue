<script setup lang="ts">
// <DPinInput> — a row of single-character cells for codes, on reka's PinInput.
// The model is always an array of single-character strings, whatever the input type;
// number mode only switches the on-screen keyboard and the accepted characters.
import { PinInputInput, PinInputRoot } from "reka-ui";

import type { DPinInputProps } from "./pinInput.types";
import { controlVariants } from "./control.variants";
import { pinInputCellVariants } from "./pinInput.variants";
import { useFormFieldContext } from "./formField.context";

type Emits = {
  /** Fired once every cell is filled. */
  complete: [value: Array<string>]
  blur: []
};

const props = withDefaults(defineProps<DPinInputProps>(), {
  length: 5,
  type: "text",
});
const emits = defineEmits<Emits>();

const { id, invalid, size } = useFormFieldContext(props);

const model = defineModel<Array<string>>({ default: () => [] });

// reka types its model by the `type` prop (string[] vs number[]); normalize to strings.
function onModelUpdate(value: Array<string | number>) {
  model.value = value.map(String);
}
</script>

<template>
  <PinInputRoot
    :id
    :model-value="model"
    :type="(type as 'text')"
    :otp
    :mask
    :placeholder
    :name
    :disabled
    :required
    class=":uno: flex items-center gap-1.5"
    @update:model-value="onModelUpdate"
    @complete="(value: Array<string | number>) => emits('complete', value.map(String))"
  >
    <PinInputInput
      v-for="index in length"
      :key="index"
      :index="index - 1"
      :aria-invalid="invalid || undefined"
      :class="[controlVariants({ size, invalid }), pinInputCellVariants({ size })]"
      @blur="emits('blur')"
    />
  </PinInputRoot>
</template>
