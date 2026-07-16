import { computed, ref } from "vue";
import { describe, expect, test } from "vitest";

import { FormStatus } from "../types/formStatus";

import { useAggregateStatus, useFormStatus } from "./useFormStatus";

describe("useFormStatus", () => {
  test("derives exactly one flag per status", () => {
    const status = ref<FormStatus>(FormStatus.PRISTINE);
    const flags = useFormStatus(status);

    expect(flags.isPristine.value).toBe(true);

    status.value = FormStatus.DIRTY;
    expect(flags.isDirty.value).toBe(true);
    expect(flags.isPristine.value).toBe(false);

    status.value = FormStatus.ERROR;
    expect(flags.hasError.value).toBe(true);

    status.value = FormStatus.PENDING;
    expect(flags.isPending.value).toBe(true);
  });
});

describe("useAggregateStatus", () => {
  function items(...statuses: Array<FormStatus>) {
    return computed(() => statuses.map(status => ({ status })));
  }

  test("empty collection is pristine", () => {
    expect(useAggregateStatus(items()).value).toBe(FormStatus.PRISTINE);
  });

  test("pending wins over error and dirty", () => {
    const status = useAggregateStatus(
      items(FormStatus.DIRTY, FormStatus.ERROR, FormStatus.PENDING),
    );

    expect(status.value).toBe(FormStatus.PENDING);
  });

  test("error wins over dirty", () => {
    const status = useAggregateStatus(items(FormStatus.DIRTY, FormStatus.ERROR));

    expect(status.value).toBe(FormStatus.ERROR);
  });

  test("dirty wins over pristine", () => {
    const status = useAggregateStatus(items(FormStatus.PRISTINE, FormStatus.DIRTY));

    expect(status.value).toBe(FormStatus.DIRTY);
  });

  test("the additional pending ref overrides everything", () => {
    const pending = ref(true);
    const status = useAggregateStatus(items(FormStatus.ERROR), pending);

    expect(status.value).toBe(FormStatus.PENDING);

    pending.value = false;
    expect(status.value).toBe(FormStatus.ERROR);
  });
});
