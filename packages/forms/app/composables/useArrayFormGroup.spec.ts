import { describe, expect, test } from "vitest";

import { FormStatus } from "../types/formStatus";
import { requiredValidator } from "../validators";

import { useArrayFormGroup } from "./useArrayFormGroup";
import { useFormControl } from "./useFormControl";
import { useFormGroup } from "./useFormGroup";

function makeContactGroup(name = "", phone = "") {
  return useFormGroup({
    name: useFormControl(name),
    phone: useFormControl(phone),
  });
}

function makeArrayGroup(initial = [makeContactGroup("John", "111")]) {
  return useArrayFormGroup(initial, {
    constructor: () => makeContactGroup(),
  });
}

describe("useArrayFormGroup", () => {
  test("aggregates data of all items", () => {
    const group = makeArrayGroup([
      makeContactGroup("John", "111"),
      makeContactGroup("Jane", "222"),
    ]);

    expect(group.data.value).toEqual([
      { name: "John", phone: "111" },
      { name: "Jane", phone: "222" },
    ]);
  });

  test("add, remove and clear controls", () => {
    const group = makeArrayGroup();

    group.addControl(makeContactGroup("Jane", "222"));
    expect(group.data.value).toHaveLength(2);

    group.removeControl(0);
    expect(group.data.value).toEqual([{ name: "Jane", phone: "222" }]);

    group.clearControls();
    expect(group.data.value).toEqual([]);
  });

  test("removeControl ignores out-of-range indexes", () => {
    const group = makeArrayGroup();

    group.removeControl(5);
    group.removeControl(-1);

    expect(group.data.value).toHaveLength(1);
  });

  test("status aggregates from items", () => {
    const first = makeContactGroup("John", "111");
    const group = makeArrayGroup([first]);

    expect(group.status.value).toBe(FormStatus.PRISTINE);

    first.patch({ name: "Johnny" });
    expect(group.status.value).toBe(FormStatus.DIRTY);

    first.setPending(true);
    expect(group.status.value).toBe(FormStatus.PENDING);
    expect(group.isPending.value).toBe(true);
  });

  test("patch updates existing items in place", () => {
    const group = makeArrayGroup([makeContactGroup("John", "111")]);

    group.patch([{ name: "Johnny" }]);

    expect(group.data.value).toEqual([{ name: "Johnny", phone: "111" }]);
  });

  test("patch grows the collection via the constructor", () => {
    const group = makeArrayGroup([]);

    group.patch([
      { name: "John", phone: "111" },
      { name: "Jane", phone: "222" },
    ]);

    expect(group.data.value).toEqual([
      { name: "John", phone: "111" },
      { name: "Jane", phone: "222" },
    ]);
  });

  test("patch shrinks the collection when given fewer items", () => {
    const group = makeArrayGroup([
      makeContactGroup("John", "111"),
      makeContactGroup("Jane", "222"),
    ]);

    group.patch([{ name: "Only" }]);

    expect(group.data.value).toEqual([{ name: "Only", phone: "111" }]);
  });

  test("patch with an empty array clears every item", () => {
    const group = makeArrayGroup([
      makeContactGroup("John", "111"),
      makeContactGroup("Jane", "222"),
    ]);

    group.patch([]);

    expect(group.data.value).toEqual([]);
  });

  test("empty collection is pristine", () => {
    const group = makeArrayGroup([]);

    expect(group.status.value).toBe(FormStatus.PRISTINE);
    expect(group.data.value).toEqual([]);
  });

  test("onlyValidate surfaces the first item error, validate marks every item", async () => {
    const validated = () => useFormGroup({
      name: useFormControl("", { validators: [requiredValidator()] }),
    });

    const group = useArrayFormGroup([validated(), validated()], {
      constructor: validated,
    });

    const error = await group.onlyValidate();
    expect(error?.message).toBe("This field is required.");
    expect(group.hasError.value).toBe(false);

    await group.validate();
    expect(group.controls[0]?.controls.name.hasError).toBe(true);
    expect(group.controls[1]?.controls.name.hasError).toBe(true);
    expect(group.hasError.value).toBe(true);
  });

  test("reset and save delegate to items", () => {
    const first = makeContactGroup("John", "111");
    const group = makeArrayGroup([first]);

    first.patch({ name: "Johnny" });
    group.save();
    expect(group.isPristine.value).toBe(true);

    first.patch({ name: "Changed again" });
    group.reset();
    expect(group.data.value).toEqual([{ name: "Johnny", phone: "111" }]);
  });
});
