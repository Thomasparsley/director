<script setup lang="ts">
// <DTimeField> — reka's segmented time input; the model is an @internationalized/date
// time value (Time, or a date-time whose date part is ignored).
import { TimeFieldInput, TimeFieldRoot, type TimeValue } from "reka-ui";

import type { DTimeFieldProps } from "./timeField.types";
import { controlFrameVariants, controlSegmentVariants } from "./control.variants";
import { useFormFieldContext } from "./formField.context";
import { formatSegmentLiteral } from "../utils/segmentLiteral";

type Emits = {
  blur: []
};

const props = defineProps<DTimeFieldProps>();
const emits = defineEmits<Emits>();

const { id, invalid, size } = useFormFieldContext(props);

const model = defineModel<TimeValue>();
</script>

<template>
  <TimeFieldRoot
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
    :class="[controlFrameVariants({ size, invalid }), ':uno: w-auto']"
    @focusout="emits('blur')"
  >
    <template
      v-for="segment in segments"
      :key="segment.part"
    >
      <TimeFieldInput
        v-if="segment.part === 'literal'"
        :part="segment.part"
        class=":uno: text-gray-400 dark:text-gray-500"
      >
        {{ formatSegmentLiteral(segment.value) }}
      </TimeFieldInput>
      <TimeFieldInput
        v-else
        :part="segment.part"
        :class="controlSegmentVariants()"
      >
        {{ segment.value }}
      </TimeFieldInput>
    </template>
  </TimeFieldRoot>
</template>
