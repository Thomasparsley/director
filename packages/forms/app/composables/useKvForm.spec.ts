import { describe, expect, test } from "vitest";

import { FormStatus } from "../types/formStatus";
import { requiredValidator } from "../validators";

import { useFormControl, type FormControl } from "./useFormControl";
import { useFormGroup } from "./useFormGroup";
import { useKvForm } from "./useKvForm";

describe("useKvForm - with controls", () => {
  test("initialize and read data", () => {
    const form = useKvForm({
      one: useFormControl(1),
      two: useFormControl(2),
    });

    expect(form.data.value).toEqual({ one: 1, two: 2 });
    expect(form.controls.one?.data).toBe(1);
    expect(form.keys.value).toEqual(["one", "two"]);
  });

  test("add and remove controls dynamically", () => {
    const form = useKvForm<"newKey">({});

    expect(form.data.value).toEqual({});

    form.setControl("newKey", useFormControl("newValue"));
    expect(form.data.value).toEqual({ newKey: "newValue" });
    expect(form.hasControl("newKey")).toBe(true);

    form.removeControl("newKey");
    expect(form.data.value).toEqual({});
    expect(form.hasControl("newKey")).toBe(false);
  });

  test("patch updates existing controls", () => {
    const form = useKvForm({
      user1: useFormControl("Alice"),
      user2: useFormControl("Bob"),
    });

    form.patch({ user1: "Alicia", user2: "Bobby" });

    expect(form.data.value).toEqual({ user1: "Alicia", user2: "Bobby" });
    expect(form.isDirty.value).toBe(true);
  });

  test("patch with builder creates missing controls", () => {
    const form = useKvForm<"paramA" | "paramB", FormControl<string>>(
      {},
      { builder: (_key, value) => useFormControl(value) },
    );

    form.patch({ paramA: "Value A", paramB: "Value B" });

    expect(form.hasControl("paramA")).toBe(true);
    expect(form.data.value).toEqual({ paramA: "Value A", paramB: "Value B" });
  });

  test("patch without builder ignores unknown keys", () => {
    const form = useKvForm<"known" | "unknown">({ known: useFormControl("a") });

    form.patch({ unknown: "b" });

    expect(form.hasControl("unknown")).toBe(false);
    expect(form.data.value).toEqual({ known: "a" });
  });

  test("status aggregation", () => {
    const c1 = useFormControl("valid");
    const form = useKvForm({ c1 });

    expect(form.status.value).toBe(FormStatus.PRISTINE);

    c1.data.value = "changed";
    expect(form.status.value).toBe(FormStatus.DIRTY);

    form.markAsPristine();
    expect(form.status.value).toBe(FormStatus.PRISTINE);
    expect(c1.status.value).toBe(FormStatus.PRISTINE);
  });

  test("pending status", () => {
    const form = useKvForm({ c1: useFormControl("") });

    form.setPending(true);

    expect(form.status.value).toBe(FormStatus.PENDING);
  });

  test("clear controls", () => {
    const form = useKvForm({ a: useFormControl(1) });

    form.clearControls();

    expect(form.data.value).toEqual({});
    expect(form.keys.value).toEqual([]);
  });
});

describe("useKvForm - edge cases", () => {
  test("builder receives the key and the incoming value", () => {
    const seen: Array<[string, string]> = [];

    const form = useKvForm<string, FormControl<string>>(
      {},
      {
        builder: (key, value) => {
          seen.push([key, value]);
          return useFormControl(value);
        },
      },
    );

    form.patch({ alpha: "A", beta: "B" });

    expect(seen).toEqual([["alpha", "A"], ["beta", "B"]]);
  });

  test("markAsDirty propagates to controls", () => {
    const control = useFormControl("a");
    const form = useKvForm({ control });

    form.markAsDirty();

    expect(control.isDirty.value).toBe(true);
    expect(form.isDirty.value).toBe(true);
  });

  test("reset and save delegate to controls", () => {
    const control = useFormControl("a");
    const form = useKvForm({ control });

    control.data.value = "b";
    form.save();
    expect(form.isPristine.value).toBe(true);

    control.data.value = "c";
    form.reset();
    expect(form.data.value).toEqual({ control: "b" });
  });

  test("keys stay in sync with dynamic controls", () => {
    const form = useKvForm<"a" | "b">({ a: useFormControl(1) });

    expect(form.keys.value).toEqual(["a"]);

    form.setControl("b", useFormControl(2));
    expect(form.keys.value).toEqual(["a", "b"]);

    form.removeControl("a");
    expect(form.keys.value).toEqual(["b"]);
  });

  test("validation aggregates across controls", async () => {
    const form = useKvForm({
      filled: useFormControl("ok", { validators: [requiredValidator()] }),
      empty: useFormControl("", { validators: [requiredValidator()] }),
    });

    await form.validate();

    expect(form.hasError.value).toBe(true);
    expect(form.controls.empty?.hasError).toBe(true);
    expect(form.controls.filled?.hasError).toBe(false);
  });
});

describe("useKvForm - with groups", () => {
  test("nested form groups", () => {
    const form = useKvForm({
      group1: useFormGroup({ name: useFormControl("Group 1") }),
      group2: useFormGroup({ name: useFormControl("Group 2") }),
    });

    expect(form.data.value).toEqual({
      group1: { name: "Group 1" },
      group2: { name: "Group 2" },
    });

    form.patch({
      group1: { name: "Updated Group 1" },
      group2: { name: "Updated Group 2" },
    });

    expect(form.data.value).toEqual({
      group1: { name: "Updated Group 1" },
      group2: { name: "Updated Group 2" },
    });

    expect(form.controls.group1?.controls.name.data).toBe("Updated Group 1");
  });
});
