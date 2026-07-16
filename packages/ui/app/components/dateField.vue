<script setup lang="ts">
// <DDateField> — reka's segmented date input: each date part is its own keyboard-editable
// segment, no free-text parsing. The model is an @internationalized/date DateValue.
import { DateFieldInput, DateFieldRoot } from "reka-ui";
import type { DateValue } from "@internationalized/date";

import type { DDateFieldProps } from "./dateField.types";
import { controlFrameVariants, controlSegmentVariants } from "./control.variants";
import { useFormFieldContext } from "./formField.context";
import { formatSegmentLiteral } from "../utils/segmentLiteral";

type Emits = {
  blur: []
};

const props = defineProps<DDateFieldProps>();
const emits = defineEmits<Emits>();

const { id, invalid, size } = useFormFieldContext(props);

const model = defineModel<DateValue>();
</script>

<template>
  <DateFieldRoot
    :id
    v-slot="{ segments }"
    v-model="model"
    :granularity
    :min-value="minValue"
    :max-value="maxValue"
    :hour-cycle="hourCycle"
    :locale
    :name
    :disabled
    :required
    :aria-invalid="invalid || undefined"
    :class="controlFrameVariants({ size, invalid })"
    @focusout="emits('blur')"
  >
    <template
      v-for="segment in segments"
      :key="segment.part"
    >
      <DateFieldInput
        v-if="segment.part === 'literal'"
        :part="segment.part"
        class=":uno: text-gray-400 dark:text-gray-500"
      >
        {{ formatSegmentLiteral(segment.value) }}
      </DateFieldInput>
      <DateFieldInput
        v-else
        :part="segment.part"
        :class="controlSegmentVariants()"
      >
        {{ segment.value }}
      </DateFieldInput>
    </template>
  </DateFieldRoot>
</template>
