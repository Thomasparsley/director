<script setup lang="ts">
// <DFormTimeField> — DTimeField driven by a FormControl<string | null> holding "HH:mm"
// (or "HH:mm:ss" with second granularity), the transport-friendly shape for APIs.
import { computed } from "vue";
import type { TimeValue } from "reka-ui";

import DFormField from "#layers/director-ui/app/components/formField.vue";
import DTimeField from "#layers/director-ui/app/components/timeField.vue";

import type { BaseFormBindingProps } from "../types/props";
import { useFormFields } from "../composables/useFormFields";
import { timeStringToTime, timeToTimeString } from "../utils/date";

interface Props extends BaseFormBindingProps<string | null> {
  readonly granularity?: "hour" | "minute" | "second"
  readonly minValue?: TimeValue
  readonly maxValue?: TimeValue
  readonly hourCycle?: 12 | 24
  readonly locale?: string
  readonly name?: string
}

const props = withDefaults(defineProps<Props>(), {
  granularity: "minute",
});

const { fieldValue, fieldError } = useFormFields(props.control);

const timeValue = computed<TimeValue | undefined>({
  get: () => timeStringToTime(fieldValue.value),
  set: (value) => {
    fieldValue.value = timeToTimeString(value, props.granularity);
  },
});

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
    <DTimeField
      v-model="timeValue"
      :granularity
      :min-value="minValue"
      :max-value="maxValue"
      :hour-cycle="hourCycle"
      :locale
      :name
      :disabled
      :required
      @blur="onBlur"
    />
  </DFormField>
</template>
