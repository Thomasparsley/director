// Realistic end-to-end scenarios: whole forms composed the way a consuming app
// (e.g. firesport) builds them, driven through complete user journeys.
import { describe, expect, test, vi } from "vitest";

import { FormStatus } from "./types/formStatus";

import { useArrayFormGroup } from "./composables/useArrayFormGroup";
import { useDateFormControl } from "./composables/useDateFormControl";
import { useFormControl, type FormControl } from "./composables/useFormControl";
import { useFormGroup } from "./composables/useFormGroup";
import { useFormSubmit } from "./composables/useFormSubmit";
import { useKvForm } from "./composables/useKvForm";

import { stringTrimTransformer, valueEmptyAsNullTransformer } from "./transformers";
import {
  dateBeforeValidator,
  emailValidator,
  numberPositiveIntegerValidator,
  requiredValidator,
  stringMinLengthValidator,
  valueEqualsToValidator,
} from "./validators";

describe("scenario: user profile editing", () => {
  function makeProfileForm() {
    return useFormGroup({
      name: useFormControl<string>("", {
        validators: [requiredValidator()],
        lazyTransformers: [stringTrimTransformer],
      }),
      email: useFormControl<string>("", {
        validators: [requiredValidator(), emailValidator()],
      }),
      bio: useFormControl<string | null>(null, {
        transformers: [valueEmptyAsNullTransformer],
      }),
    });
  }

  test("load from API, edit, and reset back to the loaded state", () => {
    const form = makeProfileForm();

    // Loading API data must not make the form look user-modified,
    // and reset must return HERE, not to the empty construction state.
    form.patch(
      { name: "Jane Doe", email: "jane@example.com", bio: "Firefighter" },
      { write: true },
    );

    expect(form.isPristine.value).toBe(true);

    form.controls.name.data = "Jane Smith";
    form.controls.bio.data = "";
    expect(form.isDirty.value).toBe(true);
    // The eager transformer already normalized the emptied bio to null.
    expect(form.data.value.bio).toBeNull();

    form.reset();

    expect(form.isPristine.value).toBe(true);
    expect(form.data.value).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      bio: "Firefighter",
    });
  });

  test("blur-style lazy transform cleans up input before validation", async () => {
    const form = makeProfileForm();

    form.controls.email.data = "jane@example.com";
    form.controls.name.data = "   Jane Doe   ";
    form.controls.name.transform();

    expect(form.data.value.name).toBe("Jane Doe");

    await form.validate();
    expect(form.hasError.value).toBe(false);
  });

  test("save() makes the edited state the new baseline", () => {
    const form = makeProfileForm();
    form.patch({ name: "Jane", email: "jane@example.com", bio: null }, { write: true });

    form.controls.name.data = "Janet";
    form.save();

    form.controls.name.data = "Someone else";
    form.reset();

    expect(form.data.value.name).toBe("Janet");
  });
});

describe("scenario: registration with password confirmation", () => {
  function makeRegistrationForm() {
    const password = useFormControl<string>("", {
      validators: [requiredValidator(), stringMinLengthValidator(8)],
    });

    return useFormGroup({
      email: useFormControl<string>("", {
        validators: [requiredValidator(), emailValidator()],
      }),
      password,
      passwordConfirm: useFormControl<string>("", {
        validators: [
          valueEqualsToValidator(password, { errorMessage: "Passwords do not match." }),
        ],
      }),
    });
  }

  test("mismatched confirmation blocks the submit, fixing it unblocks", async () => {
    const form = makeRegistrationForm();
    const onSubmit = vi.fn();
    const submit = useFormSubmit(form, onSubmit);

    form.patch({
      email: "jane@example.com",
      password: "hunter2hunter2",
      passwordConfirm: "hunter2",
    });

    await submit.executeSubmit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(form.controls.passwordConfirm.error?.message).toBe("Passwords do not match.");

    form.controls.passwordConfirm.data = "hunter2hunter2";
    await submit.executeSubmit();

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  test("server failure keeps the form dirty for a retry; success saves it", async () => {
    const form = makeRegistrationForm();
    const errors: Array<unknown> = [];

    let attempts = 0;
    const submit = useFormSubmit(
      form,
      async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("500 Internal Server Error");
        }

        // The usual after-success step: commit the values as the new baseline.
        return () => form.save();
      },
      { onError: error => errors.push(error) },
    );

    form.patch({
      email: "jane@example.com",
      password: "hunter2hunter2",
      passwordConfirm: "hunter2hunter2",
    });

    await submit.executeSubmit();
    expect(errors).toHaveLength(1);
    expect(form.isDirty.value).toBe(true);
    expect(submit.isDisabled.value).toBe(false);

    await submit.executeSubmit();
    expect(attempts).toBe(2);
    expect(form.isPristine.value).toBe(true);
    // Nothing left to submit — the button should be disabled again.
    expect(submit.isDisabled.value).toBe(true);
  });
});

describe("scenario: order form composing every abstraction", () => {
  type AddressControls = {
    city: FormControl<string>
    street: FormControl<string>
  };

  function makeLineItem() {
    return useFormGroup({
      product: useFormControl<string>("", { validators: [requiredValidator()] }),
      quantity: useFormControl<number>(1, { validators: [numberPositiveIntegerValidator()] }),
    });
  }

  function makeOrderForm() {
    return useFormGroup({
      customer: useFormControl<string>("", { validators: [requiredValidator()] }),
      items: useArrayFormGroup([], { constructor: makeLineItem }),
      shippingAddress: useFormGroup<AddressControls, true>(null, {
        constructor: () => ({
          city: useFormControl<string>("", { validators: [requiredValidator()] }),
          street: useFormControl<string>(""),
        }),
      }),
      metadata: useKvForm<string, FormControl<string>>(
        {},
        { builder: (_key, value) => useFormControl(value) },
      ),
    });
  }

  const apiPayload = {
    customer: "ACME Corp",
    items: [
      { product: "Hose", quantity: 2 },
      { product: "Nozzle", quantity: 1 },
    ],
    shippingAddress: { city: "Prague", street: "Na Příkopě 1" },
    metadata: { priority: "high", channel: "web" },
  };

  test("a single patch hydrates the whole tree from an API payload", () => {
    const form = makeOrderForm();

    form.patch(apiPayload, { write: true });

    expect(form.data.value).toEqual(apiPayload);
    expect(form.isPristine.value).toBe(true);
  });

  test("editing deep in the tree dirties the root; reset restores the payload", () => {
    const form = makeOrderForm();
    form.patch(apiPayload, { write: true });

    form.controls.items.controls[0]!.controls.quantity.data = 5;

    expect(form.isDirty.value).toBe(true);

    form.reset();

    expect(form.data.value).toEqual(apiPayload);
    expect(form.isPristine.value).toBe(true);
  });

  test("adding and removing line items updates the aggregated data", () => {
    const form = makeOrderForm();
    form.patch(apiPayload, { write: true });

    const item = makeLineItem();
    item.patch({ product: "Helmet", quantity: 3 });
    form.controls.items.addControl(item);

    expect(form.data.value.items).toHaveLength(3);
    expect(form.data.value.items[2]).toEqual({ product: "Helmet", quantity: 3 });

    form.controls.items.removeControl(0);

    expect(form.data.value.items.map(i => i.product)).toEqual(["Nozzle", "Helmet"]);
  });

  test("validation reaches every level of the tree", async () => {
    const form = makeOrderForm();
    form.patch(apiPayload, { write: true });

    // Invalidate one field on each level: root control, array item, nullable group.
    form.controls.customer.data = "";
    form.controls.items.controls[1]!.controls.quantity.data = 0;
    form.controls.shippingAddress.controls!.city.data = "";

    await form.validate();

    expect(form.hasError.value).toBe(true);
    expect(form.controls.customer.hasError).toBe(true);
    expect(form.controls.items.controls[1]!.controls.quantity.hasError).toBe(true);
    expect(form.controls.shippingAddress.controls!.city.hasError).toBe(true);
    // Valid siblings stay clean.
    expect(form.controls.items.controls[0]!.controls.quantity.hasError).toBe(false);
  });

  test("clearing the optional address nulls it in the payload", () => {
    const form = makeOrderForm();
    form.patch(apiPayload, { write: true });

    form.controls.shippingAddress.clearControls();

    expect(form.data.value.shippingAddress).toBeNull();
  });

  test("a pending child suspends the whole order form", () => {
    const form = makeOrderForm();
    form.patch(apiPayload, { write: true });

    form.controls.shippingAddress.setPending(true);

    expect(form.status.value).toBe(FormStatus.PENDING);
    expect(form.isPending.value).toBe(true);
  });
});

describe("scenario: event date range with cross-field validation", () => {
  function makeEventForm() {
    const endsAt = useDateFormControl(null, { validators: [requiredValidator()] });

    const startsAt = useDateFormControl(null, {
      validators: [
        requiredValidator(),
        dateBeforeValidator(() => endsAt.data.value, {
          errorMessage: "Start must be before the end.",
        }),
      ],
    });

    return useFormGroup({ startsAt, endsAt });
  }

  test("a start date after the end date is rejected; fixing the end revalidates", async () => {
    const form = makeEventForm();

    form.patch({
      startsAt: "2026-08-02T10:00:00Z",
      endsAt: "2026-08-01T10:00:00Z",
    });

    await form.validate();
    expect(form.controls.startsAt.error?.message).toBe("Start must be before the end.");

    form.controls.endsAt.patch("2026-08-03T10:00:00Z");
    await form.validate();

    expect(form.hasError.value).toBe(false);
  });

  test("the bound is skipped while the end date is still unset", async () => {
    const form = makeEventForm();

    form.controls.startsAt.patch("2026-08-02T10:00:00Z");

    // The end date is required and empty — but the *cross-field* rule must not
    // fire while its bound is unset.
    expect(await form.controls.startsAt.onlyValidate()).toBeNull();
  });
});
