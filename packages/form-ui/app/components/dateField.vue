<script setup lang="ts">
// <DFormDateField> — DDateField driven by a Date-typed FormControl (useDateFormControl):
// converts Date ⇄ DateValue at the boundary so the form model stays a plain Date.
import { computed } from "vue";
import type { DateValue } from "@internationalized/date";

import DDateField from "#layers/director-ui/app/components/dateField.vue";
import DFormField from "#layers/director-ui/app/components/formField.vue";

import type { BaseFormBindingProps } from "../types/props";
import { useFormFields } from "../composables/useFormFields";
import { dateToDateValue, dateValueToDate, type DateGranularity } from "../utils/date";

interface Props extends BaseFormBindingProps<Date, Date | string | null> {
  readonly granularity?: DateGranularity
  readonly minValue?: DateValue
  readonly maxValue?: DateValue
  readonly hourCycle?: 12 | 24
  readonly locale?: string
  readonly name?: string
}

const props = withDefaults(defineProps<Props>(), {
  granularity: "day",
});

const { fieldValue, fieldError } = useFormFields(props.control);

const dateValue = computed<DateValue | undefined>({
  get: () => dateToDateValue(fieldValue.value, props.granularity),
  set: (value) => {
    fieldValue.value = dateValueToDate(value);
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
    <DDateField
      v-model="dateValue"
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
