import { computed } from "vue";

import type { PatchFormOptions } from "../types/patching";

import { useFormControl, type FormControl, type FormControlConfig } from "./useFormControl";

function coerceDate(value: Date | string | null): Date {
  if (value instanceof Date) {
    return value;
  }

  // `new Date("")` yields an Invalid Date, which `requiredValidator` treats as empty.
  return new Date(value ?? "");
}

/**
 * A form control that always reads a `Date` but accepts `Date | string | null` on
 * writes and patches — convenient for date inputs and API payloads.
 */
export function useDateFormControl(
  initialValue: Date | string | null,
  config?: FormControlConfig<Date, Date | string | null>,
): FormControl<Date, Date | string | null> {
  const control = useFormControl<Date, Date | string | null>(coerceDate(initialValue), config);

  const dataWriter = computed<Date, Date | string | null>({
    get: () => control.data.value,
    set: (value) => {
      control.data.value = coerceDate(value);
    },
  });

  function patch(value: Date | string | null, options?: PatchFormOptions): void {
    control.patch(coerceDate(value), options);
  }

  return {
    ...control,
    data: dataWriter,
    patch,
  };
}
