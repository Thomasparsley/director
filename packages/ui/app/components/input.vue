<script setup lang="ts">
// <DInput> — a text input on the frosted control fill, with room for leading/trailing icons.
import { useAttrs, useTemplateRef } from "vue";

import type { DInputProps } from "./input.types";
import { controlVariants } from "./control.variants";
import { inputAffixSlotVariants, inputAffixVariants } from "./input.variants";
import { useFormFieldContext } from "./formField.context";

type Emits = {
  blur: []
  enter: []
};

/**
 * Attributes are split: `class` and `style` stay on the wrapper, everything else goes to the input.
 *
 * The root here is a positioning `div` for the affix slots, so by default *every* attribute a
 * caller passes lands on it — including `aria-label`, which on a div gives the control no
 * accessible name at all. That is how a field ends up unlabelled while looking perfectly fine.
 *
 * But moving all of them is wrong in the other direction: a caller writing `class="w-40"` is sizing
 * the control's box, and putting that on the input instead of the wrapper changes the layout of
 * every consumer. So the two are separated deliberately rather than by a single `inheritAttrs`
 * switch.
 */
defineOptions({ inheritAttrs: false });

const { class: rootClass, style: rootStyle, ...controlAttrs } = useAttrs();

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
  <div
    :class="[':uno: relative', rootClass]"
    :style="rootStyle"
  >
    <span
      v-if="$slots.leading"
      :class="inputAffixSlotVariants({ side: 'leading' })"
    >
      <slot name="leading" />
    </span>

    <input
      :id
      ref="input"
      v-bind="controlAttrs"
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
