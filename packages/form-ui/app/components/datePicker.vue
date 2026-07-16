<script setup lang="ts">
// <DFormDatePicker> — DDatePicker driven by a Date-typed FormControl (useDateFormControl);
// validates when the calendar closes, the picker's equivalent of blur.
import { computed } from "vue";
import type { DateValue } from "@internationalized/date";

import DDatePicker from "#layers/director-ui/app/components/datePicker.vue";
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
  readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
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

function onOpenChange(open: boolean) {
  if (!open) {
    props.control.validate();
  }
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
    <DDatePicker
      v-model="dateValue"
      :granularity
      :min-value="minValue"
      :max-value="maxValue"
      :hour-cycle="hourCycle"
      :locale
      :week-starts-on="weekStartsOn"
      :name
      :disabled
      :required
      @update:open="onOpenChange"
    />
  </DFormField>
</template>
