import { describe, expect, test } from "vitest";

import { FormStatus } from "../types/formStatus";
import { requiredValidator } from "../validators";

import { useFormControl, type FormControl } from "./useFormControl";
import { useFormGroup } from "./useFormGroup";

describe("useFormGroup", () => {
  test("initialize and read aggregated data", () => {
    const group = useFormGroup({
      name: useFormControl("John"),
      age: useFormControl(30),
    });

    expect(group.data.value).toEqual({ name: "John", age: 30 });
  });

  test("updating a child control updates the group data", () => {
    const nameControl = useFormControl("John");
    const group = useFormGroup({ name: nameControl });

    nameControl.data.value = "Jane";

    expect(group.data.value).toEqual({ name: "Jane" });
  });

  test("dirty status aggregates from children", () => {
    const nameControl = useFormControl("John");
    const group = useFormGroup({ name: nameControl, age: useFormControl(30) });

    expect(group.status.value).toBe(FormStatus.PRISTINE);

    nameControl.data.value = "Jane";

    expect(group.status.value).toBe(FormStatus.DIRTY);
    expect(group.isDirty.value).toBe(true);
  });

  test("error status aggregates from children", async () => {
    const nameControl = useFormControl("", { validators: [requiredValidator()] });
    const group = useFormGroup({ name: nameControl });

    await group.validate();

    expect(group.status.value).toBe(FormStatus.ERROR);
    expect(group.hasError.value).toBe(true);
  });

  test("markAsPristine / markAsDirty propagate to children", () => {
    const nameControl = useFormControl("John");
    const group = useFormGroup({ name: nameControl });

    group.markAsDirty();
    expect(nameControl.isDirty.value).toBe(true);

    group.markAsPristine();
    expect(nameControl.isPristine.value).toBe(true);
    expect(group.isPristine.value).toBe(true);
  });

  test("patch values to children", () => {
    const nameControl = useFormControl("John");
    const ageControl = useFormControl(30);
    const group = useFormGroup({ name: nameControl, age: ageControl });

    group.patch({ name: "Jane", age: 31 });

    expect(nameControl.data.value).toBe("Jane");
    expect(ageControl.data.value).toBe(31);
    expect(group.isDirty.value).toBe(true);
  });

  test("patch values as pristine", () => {
    const nameControl = useFormControl("John");
    const group = useFormGroup({ name: nameControl });

    group.patch({ name: "Jane" }, { asPristine: true });

    expect(nameControl.data.value).toBe("Jane");
    expect(group.isPristine.value).toBe(true);
  });

  test("reset reverts children to original data", () => {
    const nameControl = useFormControl("John");
    const group = useFormGroup({ name: nameControl });

    nameControl.data.value = "Jane";
    group.reset();

    expect(group.data.value).toEqual({ name: "John" });
    expect(group.isPristine.value).toBe(true);
  });

  test("save commits children's current data as original", () => {
    // Regression: the original implementation reset children instead of saving them.
    const nameControl = useFormControl("John");
    const group = useFormGroup({ name: nameControl });

    nameControl.data.value = "Jane";
    group.save();

    expect(group.data.value).toEqual({ name: "Jane" });
    expect(group.isPristine.value).toBe(true);

    nameControl.data.value = "Other";
    group.reset();
    expect(group.data.value).toEqual({ name: "Jane" });
  });

  test("pending status", () => {
    const group = useFormGroup({ name: useFormControl("") });

    expect(group.isPending.value).toBe(false);

    group.setPending(true);

    expect(group.isPending.value).toBe(true);
    expect(group.status.value).toBe(FormStatus.PENDING);
  });

  test("afterPendingDone runs immediately when not pending, otherwise after clearing", async () => {
    const group = useFormGroup({ name: useFormControl("") });

    let ranImmediately = false;
    group.afterPendingDone(() => {
      ranImmediately = true;
    });
    expect(ranImmediately).toBe(true);

    group.setPending(true);
    let ranLater = false;
    group.afterPendingDone(() => {
      ranLater = true;
    });
    expect(ranLater).toBe(false);

    group.setPending(false);
    // The pending watcher fires on the microtask queue.
    await Promise.resolve();
    expect(ranLater).toBe(true);
  });
});

describe("useFormGroup - nullable", () => {
  type FormFieldsType = {
    name: FormControl<string>
  };

  test("initialize with null", () => {
    const group = useFormGroup<FormFieldsType, true>(null, {
      constructor: () => ({ name: useFormControl("Default") }),
    });

    expect(group.controls).toBeNull();
    expect(group.data.value).toBeNull();
  });

  test("construct and clear controls", () => {
    const group = useFormGroup<FormFieldsType, true>(null, {
      constructor: () => ({ name: useFormControl("Constructed") }),
    });

    group.constructControls();
    expect(group.controls?.name.data).toBe("Constructed");
    expect(group.data.value).toEqual({ name: "Constructed" });

    group.clearControls();
    expect(group.controls).toBeNull();
    expect(group.data.value).toBeNull();
  });

  test("patch automatically constructs controls when missing", () => {
    const group = useFormGroup<FormFieldsType, true>(null, {
      constructor: () => ({ name: useFormControl("Default") }),
    });

    group.patch({ name: "Patched" });

    expect(group.data.value).toEqual({ name: "Patched" });
  });

  test("clearControls is a no-op on non-nullable groups", () => {
    const group = useFormGroup({ name: useFormControl("John") });

    group.clearControls();

    expect(group.data.value).toEqual({ name: "John" });
  });
});

describe("useFormGroup - edge cases", () => {
  test("patch ignores keys without a matching control", () => {
    const group = useFormGroup({ name: useFormControl("John") });

    group.patch({ name: "Jane", unknown: "ignored" } as never);

    expect(group.data.value).toEqual({ name: "Jane" });
  });

  test("onlyValidate returns the first child error without storing it", async () => {
    const name = useFormControl("", { validators: [requiredValidator({ errorMessage: "name required" })] });
    const email = useFormControl("", { validators: [requiredValidator({ errorMessage: "email required" })] });
    const group = useFormGroup({ name, email });

    const error = await group.onlyValidate();

    expect(error?.message).toBe("name required");
    expect(name.hasError.value).toBe(false);
    expect(group.hasError.value).toBe(false);
  });

  test("validate stores an error on every invalid child, not just the first", async () => {
    const name = useFormControl("", { validators: [requiredValidator()] });
    const email = useFormControl("", { validators: [requiredValidator()] });
    const group = useFormGroup({ name, email });

    await group.validate();

    expect(name.hasError.value).toBe(true);
    expect(email.hasError.value).toBe(true);
  });

  test("setControls(null) is ignored on non-nullable groups", () => {
    const group = useFormGroup({ name: useFormControl("John") });

    group.setControls(null as never);

    expect(group.data.value).toEqual({ name: "John" });
  });

  test("patching a nullable group without a constructor is a no-op", () => {
    const group = useFormGroup<{ name: FormControl<string> }, true>(null);

    group.patch({ name: "Patched" });

    expect(group.controls).toBeNull();
    expect(group.data.value).toBeNull();
  });

  test("an empty non-nullable group is pristine and has empty data", () => {
    const group = useFormGroup({});

    expect(group.data.value).toEqual({});
    expect(group.status.value).toBe(FormStatus.PRISTINE);
  });

  test("each group gets a distinct key", () => {
    const first = useFormGroup({ name: useFormControl("a") });
    const second = useFormGroup({ name: useFormControl("b") });

    expect(first.key).not.toBe(second.key);
  });
});

describe("useFormGroup - nested", () => {
  test("nested groups aggregate data deeply", () => {
    const addressGroup = useFormGroup({
      city: useFormControl("New York"),
      street: useFormControl("5th Avenue"),
    });

    const userForm = useFormGroup({
      name: useFormControl("John Doe"),
      address: addressGroup,
    });

    expect(userForm.data.value).toEqual({
      name: "John Doe",
      address: { city: "New York", street: "5th Avenue" },
    });
  });

  test("nested dirtiness propagates to the parent", () => {
    const city = useFormControl("New York");
    const userForm = useFormGroup({ address: useFormGroup({ city }) });

    expect(userForm.isDirty.value).toBe(false);

    city.data.value = "London";

    expect(userForm.isDirty.value).toBe(true);
  });

  test("nested pending propagates to the parent", () => {
    const addressGroup = useFormGroup({ city: useFormControl("New York") });
    const userForm = useFormGroup({ address: addressGroup });

    addressGroup.setPending(true);

    expect(userForm.isPending.value).toBe(true);
  });

  test("patching and resetting nested groups", () => {
    const city = useFormControl("New York");
    const userForm = useFormGroup({ address: useFormGroup({ city }) });

    userForm.patch({ address: { city: "Paris" } });
    expect(city.data.value).toBe("Paris");

    userForm.reset();
    expect(city.data.value).toBe("New York");
    expect(userForm.isPristine.value).toBe(true);
  });
});
