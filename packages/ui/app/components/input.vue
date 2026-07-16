<script setup lang="ts">
// <DInput> — a text input on the frosted control fill, with room for leading/trailing icons.
import { useTemplateRef } from "vue";

import type { DInputProps } from "./input.types";
import { controlVariants } from "./control.variants";
import { inputAffixSlotVariants, inputAffixVariants } from "./input.variants";
import { useFormFieldContext } from "./formField.context";

type Emits = {
  blur: []
  enter: []
};

const props = withDefaults(defineProps<DInputProps>(), {
  type: "text",
});
const emits = defineEmits<Emits>();

const { id, invalid, size } = useFormFieldContext(props);

const model = defineModel<string | number>();

const input = useTemplateRef("input");

defineExpose({
  focus: () => input.value?.focus(),
});
</script>

<template>
  <div class=":uno: relative">
    <span
      v-if="$slots.leading"
      :class="inputAffixSlotVariants({ side: 'leading' })"
    >
      <slot name="leading" />
    </span>

    <input
      :id
      ref="input"
      v-model="model"
      :type
      :name
      :placeholder
      :autocomplete
      :maxlength="maxLength"
      :disabled
      :required
      :aria-invalid="invalid || undefined"
      :class="[
        controlVariants({ size, invalid }),
        inputAffixVariants({ leading: !!$slots.leading, trailing: !!$slots.trailing }),
      ]"
      @blur="emits('blur')"
      @keydown.enter="emits('enter')"
    >

    <span
      v-if="$slots.trailing"
      :class="inputAffixSlotVariants({ side: 'trailing' })"
    >
      <slot name="trailing" />
    </span>
  </div>
</template>
