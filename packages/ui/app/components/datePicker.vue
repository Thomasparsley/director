<script setup lang="ts">
// <DDatePicker> — reka's date picker: the segmented DDateField editing experience plus a
// calendar trigger opening the shared glass popover. Model is a DateValue, same as DDateField.
import {
  DatePickerCalendar,
  DatePickerCell,
  DatePickerCellTrigger,
  DatePickerContent,
  DatePickerField,
  DatePickerGrid,
  DatePickerGridBody,
  DatePickerGridHead,
  DatePickerGridRow,
  DatePickerHeadCell,
  DatePickerHeader,
  DatePickerHeading,
  DatePickerInput,
  DatePickerNext,
  DatePickerPrev,
  DatePickerRoot,
  DatePickerTrigger,
} from "reka-ui";
import type { DateValue } from "@internationalized/date";

import type { DDatePickerProps } from "./datePicker.types";
import { controlFrameVariants, controlPopoverVariants, controlSegmentVariants } from "./control.variants";
import {
  calendarCellTriggerVariants,
  calendarHeadCellVariants,
  calendarNavButtonVariants,
} from "./datePicker.variants";
import { useFormFieldContext } from "./formField.context";
import { formatSegmentLiteral } from "../utils/segmentLiteral";

type Emits = {
  /** Re-emitted from reka so callers can validate when the calendar closes. */
  "update:open": [open: boolean]
};

const props = defineProps<DDatePickerProps>();
const emits = defineEmits<Emits>();

const { id, invalid, size } = useFormFieldContext(props);

const model = defineModel<DateValue>();
</script>

<template>
  <DatePickerRoot
    v-model="model"
    :granularity
    :min-value="minValue"
    :max-value="maxValue"
    :hour-cycle="hourCycle"
    :locale
    :week-starts-on="weekStartsOn"
    :name
    :disabled
    :required
    @update:open="(open) => emits('update:open', open)"
  >
    <DatePickerField
      :id
      v-slot="{ segments }"
      :aria-invalid="invalid || undefined"
      :class="[controlFrameVariants({ size, invalid }), ':uno: justify-between gap-2']"
    >
      <div class=":uno: flex items-center">
        <template
          v-for="segment in segments"
          :key="segment.part"
        >
          <DatePickerInput
            v-if="segment.part === 'literal'"
            :part="segment.part"
            class=":uno: text-gray-400 dark:text-gray-500"
          >
            {{ formatSegmentLiteral(segment.value) }}
          </DatePickerInput>
          <DatePickerInput
            v-else
            :part="segment.part"
            :class="controlSegmentVariants()"
          >
            {{ segment.value }}
          </DatePickerInput>
        </template>
      </div>

      <DatePickerTrigger class=":uno: inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md p-1 text-gray-400 transition-colors duration-100 hover:vtext-1 focus-visible:(outline-none ring-2 ring-primary-400/70) dark:text-gray-500">
        <IconCalendar class=":uno: h-4 w-4" />
      </DatePickerTrigger>
    </DatePickerField>

    <DatePickerContent
      :side-offset="4"
      :class="[controlPopoverVariants(), ':uno: p-3']"
    >
      <DatePickerCalendar v-slot="{ weekDays, grid }">
        <DatePickerHeader class=":uno: mb-2 flex items-center justify-between">
          <DatePickerPrev :class="calendarNavButtonVariants()">
            <IconChevronLeft class=":uno: h-4 w-4" />
          </DatePickerPrev>

          <DatePickerHeading class=":uno: text-sm font-semibold vtext-1" />

          <DatePickerNext :class="calendarNavButtonVariants()">
            <IconChevronRight class=":uno: h-4 w-4" />
          </DatePickerNext>
        </DatePickerHeader>

        <DatePickerGrid
          v-for="month in grid"
          :key="month.value.toString()"
          class=":uno: w-full border-collapse select-none space-y-1"
        >
          <DatePickerGridHead>
            <DatePickerGridRow class=":uno: mb-1 flex w-full justify-between">
              <DatePickerHeadCell
                v-for="day in weekDays"
                :key="day"
                :class="calendarHeadCellVariants()"
              >
                {{ day }}
              </DatePickerHeadCell>
            </DatePickerGridRow>
          </DatePickerGridHead>

          <DatePickerGridBody>
            <DatePickerGridRow
              v-for="(weekDates, index) in month.rows"
              :key="`week-${index}`"
              class=":uno: flex w-full justify-between"
            >
              <DatePickerCell
                v-for="weekDate in weekDates"
                :key="weekDate.toString()"
                :date="weekDate"
              >
                <DatePickerCellTrigger
                  :day="weekDate"
                  :month="month.value"
                  :class="calendarCellTriggerVariants()"
                />
              </DatePickerCell>
            </DatePickerGridRow>
          </DatePickerGridBody>
        </DatePickerGrid>
      </DatePickerCalendar>
    </DatePickerContent>
  </DatePickerRoot>
</template>
