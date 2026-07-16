import { describe, expect, test, vi } from "vitest";

import { requiredValidator } from "../validators";

import { useFormControl } from "./useFormControl";
import { useFormGroup } from "./useFormGroup";
import { useFormSubmit } from "./useFormSubmit";

describe("useFormSubmit", () => {
  test("is disabled until the form is dirty", () => {
    const form = useFormGroup({ name: useFormControl("John") });
    const submit = useFormSubmit(form, () => { });

    expect(submit.isDisabled.value).toBe(true);

    form.patch({ name: "Jane" });

    expect(submit.isDisabled.value).toBe(false);
  });

  test("validates before submitting and blocks on error", async () => {
    const name = useFormControl("", { validators: [requiredValidator()] });
    const form = useFormGroup({ name });
    const onSubmit = vi.fn();

    const submit = useFormSubmit(form, onSubmit);

    form.markAsDirty();
    await submit.executeSubmit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(form.hasError.value).toBe(true);
  });

  test("submits a valid dirty form and toggles pending around it", async () => {
    const form = useFormGroup({ name: useFormControl("John") });

    let pendingDuringSubmit = false;
    const submit = useFormSubmit(form, () => {
      pendingDuringSubmit = form.isPending.value;
    });

    form.patch({ name: "Jane" });
    await submit.executeSubmit();

    expect(pendingDuringSubmit).toBe(true);
    expect(form.isPending.value).toBe(false);
  });

  test("runs the after-success function returned by the submit handler", async () => {
    const form = useFormGroup({ name: useFormControl("John") });
    const afterFn = vi.fn();

    const submit = useFormSubmit(form, () => afterFn);

    form.patch({ name: "Jane" });
    await submit.executeSubmit();

    expect(afterFn).toHaveBeenCalledOnce();
  });

  test("routes submit errors to the configured handler and clears pending", async () => {
    const form = useFormGroup({ name: useFormControl("John") });
    const failure = new Error("boom");
    const onError = vi.fn();

    const submit = useFormSubmit(
      form,
      () => {
        throw failure;
      },
      { onError },
    );

    form.patch({ name: "Jane" });
    await submit.executeSubmit();

    expect(onError).toHaveBeenCalledWith(failure);
    expect(form.isPending.value).toBe(false);
  });

  test("ignores re-entrant submits", async () => {
    const form = useFormGroup({ name: useFormControl("John") });

    let submitCount = 0;
    let resolveSubmit: () => void = () => { };

    const submit = useFormSubmit(form, () => {
      submitCount += 1;
      return new Promise<undefined>((resolve) => {
        resolveSubmit = () => resolve(undefined);
      });
    });

    form.patch({ name: "Jane" });

    const first = submit.executeSubmit();
    expect(submit.isLoading.value).toBe(true);

    // Wait until the first submit reaches the handler (validation is async).
    await vi.waitFor(() => expect(submitCount).toBe(1));

    await submit.executeSubmit();
    expect(submitCount).toBe(1);

    resolveSubmit();
    await first;
    expect(submit.isLoading.value).toBe(false);
  });
});
