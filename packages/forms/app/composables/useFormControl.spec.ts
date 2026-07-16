import { ref } from "vue";
import { describe, expect, test } from "vitest";

import { FormStatus } from "../types/formStatus";
import { requiredValidator } from "../validators";

import { useFormControl } from "./useFormControl";

describe("useFormControl - with value", () => {
  test("get value", () => {
    const control = useFormControl("John");

    expect(control.data.value).toBe("John");
  });

  test("set value marks the control dirty", () => {
    const control = useFormControl("John");
    control.data.value = "Jane";

    expect(control.data.value).toBe("Jane");
    expect(control.isDirty.value).toBe(true);
    expect(control.status.value).toBe(FormStatus.DIRTY);
  });

  test("mark as pristine", () => {
    const control = useFormControl("John");
    control.data.value = "Jane";

    expect(control.isPristine.value).toBe(false);
    control.markAsPristine();
    expect(control.isPristine.value).toBe(true);
  });

  test("behind ref", () => {
    const control = useFormControl("John");
    const refControl = ref(control);

    expect(refControl.value.data).toBe("John");

    refControl.value.data = "New name";
    expect(refControl.value.isDirty).toBe(true);
    expect(control.data.value).toBe("New name");
  });

  test("patch", () => {
    const control = useFormControl("John");
    control.patch("Jane");

    expect(control.data.value).toBe("Jane");
    expect(control.isDirty.value).toBe(true);
  });

  test("patch as pristine", () => {
    const control = useFormControl("John");
    control.patch("Jane", { asPristine: true });

    expect(control.data.value).toBe("Jane");
    expect(control.isPristine.value).toBe(true);
  });

  test("patch with write overwrites the original data", () => {
    const control = useFormControl("John");
    control.patch("Jane", { write: true });

    expect(control.isPristine.value).toBe(true);
    expect(control.originalData.value).toBe("Jane");

    control.data.value = "Other";
    control.reset();
    expect(control.data.value).toBe("Jane");
  });

  test("reset reverts to original data and clears the error", async () => {
    const control = useFormControl("John", { validators: [requiredValidator()] });

    control.data.value = "";
    await control.validate();
    expect(control.hasError.value).toBe(true);

    control.reset();

    expect(control.data.value).toBe("John");
    expect(control.isPristine.value).toBe(true);
    expect(control.hasError.value).toBe(false);
  });

  test("save commits the current data as original", () => {
    const control = useFormControl("John");
    control.data.value = "Jane";

    control.save();

    expect(control.isPristine.value).toBe(true);
    expect(control.originalData.value).toBe("Jane");

    control.data.value = "Other";
    control.reset();
    expect(control.data.value).toBe("Jane");
  });

  test("array control coerces scalar patches into arrays", () => {
    const control = useFormControl<Array<string>, Array<string> | string>(["a"]);

    control.patch("b");

    expect(control.data.value).toEqual(["b"]);
  });
});

describe("useFormControl - with ref", () => {
  test("stays in sync with the source ref", () => {
    const value = ref("John");
    const control = useFormControl(value);

    expect(control.data.value).toBe("John");

    value.value = "Mark";
    expect(control.data.value).toBe("Mark");

    control.data.value = "Jane";
    expect(value.value).toBe("Jane");
    expect(control.isDirty.value).toBe(true);
  });
});

describe("useFormControl - validation", () => {
  test("validate stores the first error", async () => {
    const control = useFormControl("", { validators: [requiredValidator()] });

    await control.validate();

    expect(control.hasError.value).toBe(true);
    expect(control.error.value?.message).toBe("This field is required.");
    expect(control.status.value).toBe(FormStatus.ERROR);
  });

  test("onlyValidate does not touch the error state", async () => {
    const control = useFormControl("", { validators: [requiredValidator()] });

    const error = await control.onlyValidate();

    expect(error?.message).toBe("This field is required.");
    expect(control.hasError.value).toBe(false);
  });

  test("a succeeding validator does not short-circuit the following ones", async () => {
    // Regression: validators signalling success with `undefined` must not stop the chain.
    const control = useFormControl("", {
      validators: [
        () => undefined,
        requiredValidator(),
      ],
    });

    await control.validate();

    expect(control.hasError.value).toBe(true);
  });

  test("lazy validators run only when the eager ones pass", async () => {
    let lazyRan = false;

    const control = useFormControl("", {
      validators: [requiredValidator()],
      lazyValidators: [() => {
        lazyRan = true;
        return null;
      }],
    });

    await control.validate();
    expect(lazyRan).toBe(false);

    control.data.value = "filled";
    await control.validate();
    expect(lazyRan).toBe(true);
    expect(control.hasError.value).toBe(false);
  });
});

describe("useFormControl - transformers", () => {
  test("transformers run on every write", () => {
    const control = useFormControl("John", {
      transformers: [value => value.toUpperCase()],
    });

    control.data.value = "jane";

    expect(control.data.value).toBe("JANE");
  });

  test("lazy transformers run only on transform()", () => {
    const control = useFormControl("  John  ", {
      lazyTransformers: [value => value.trim()],
    });

    expect(control.data.value).toBe("  John  ");

    control.transform();

    expect(control.data.value).toBe("John");
  });
});

describe("useFormControl - views", () => {
  test("toComputed reflects the current value", () => {
    const control = useFormControl("John");
    const view = control.toComputed();

    control.data.value = "Jane";

    expect(view.value).toBe("Jane");
  });

  test("toWritableComputed patches the control on write", () => {
    const control = useFormControl("John");
    const view = control.toWritableComputed();

    view.value = "Jane";

    expect(control.data.value).toBe("Jane");
    expect(control.isDirty.value).toBe(true);
  });
});
