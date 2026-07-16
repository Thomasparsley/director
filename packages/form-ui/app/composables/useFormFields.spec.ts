import { reactive } from "vue";
import { describe, expect, it } from "vitest";

import { useFormControl } from "#layers/director-forms/app/composables/useFormControl";
import { requiredValidator } from "#layers/director-forms/app/validators";

import { useFormFields } from "./useFormFields";

describe("useFormFields", () => {
  it("exposes a writable value for a raw control", () => {
    const control = useFormControl("initial");
    const { fieldValue } = useFormFields(control);

    expect(fieldValue.value).toBe("initial");

    fieldValue.value = "changed";
    expect(control.data.value).toBe("changed");
  });

  it("exposes a writable value for a reactive()-unwrapped control", () => {
    const control = reactive(useFormControl("initial"));
    const { fieldValue } = useFormFields(control);

    fieldValue.value = "changed";
    expect(control.data).toBe("changed");
  });

  it("reflects the validation error", async () => {
    const control = useFormControl("", { validators: [requiredValidator()] });
    const { fieldHasError, fieldError } = useFormFields(control);

    expect(fieldHasError.value).toBe(false);

    await control.validate();

    expect(fieldHasError.value).toBe(true);
    expect(fieldError.value?.message).toBeTruthy();
  });
});
