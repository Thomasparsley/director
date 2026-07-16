<script setup lang="ts">
import { useFormControl } from "#layers/director-forms/app/composables/useFormControl";
import { useFormGroup } from "#layers/director-forms/app/composables/useFormGroup";
import { useFormSubmit } from "#layers/director-forms/app/composables/useFormSubmit";
import { stringTrimTransformer } from "#layers/director-forms/app/transformers";
import {
  emailValidator,
  numberRangeValidator,
  requiredValidator,
} from "#layers/director-forms/app/validators";

const statusLabels = ["Pristine", "Dirty", "Pending", "Error"] as const;

const addressForm = useFormGroup({
  city: useFormControl("", { validators: [requiredValidator()] }),
  street: useFormControl(""),
});

const userForm = useFormGroup({
  name: useFormControl("", {
    validators: [requiredValidator()],
    lazyTransformers: [stringTrimTransformer],
  }),
  email: useFormControl("", { validators: [requiredValidator(), emailValidator()] }),
  age: useFormControl(30, { validators: [numberRangeValidator(18, 99)] }),
  address: addressForm,
});

const submitted = ref<string | null>(null);

const { isDisabled, isLoading, executeSubmit } = useFormSubmit(userForm, async () => {
  // Pretend to talk to an API so the pending state is visible.
  await new Promise(resolve => setTimeout(resolve, 800));

  return () => {
    submitted.value = JSON.stringify(userForm.data.value, null, 2);
  };
});

function fillExample() {
  userForm.patch({
    name: "  Jane Doe  ",
    email: "jane@example.com",
    age: 42,
    address: { city: "Prague", street: "Na Příkopě 1" },
  });
}
</script>

<template>
  <div class=":uno: flex flex-col gap-8">
    <p class=":uno: text-gray-600 dark:text-gray-300">
      <code>@director/forms</code> demo — <code>useFormGroup</code> + <code>useFormControl</code>
      with validators, transformers and <code>useFormSubmit</code>.
    </p>

    <section class=":uno: flex max-w-xl flex-col gap-4">
      <div class=":uno: flex items-center gap-3">
        <h2 class=":uno: text-sm font-semibold vtext-1">
          User form
        </h2>
        <DBadge :color="userForm.hasError.value ? 'error' : userForm.isDirty.value ? 'warn' : 'success'">
          {{ statusLabels[userForm.status.value] }}
        </DBadge>
      </div>

      <label class=":uno: flex flex-col gap-1 text-sm">
        <span class=":uno: vtext-1">Name</span>
        <input
          v-model="userForm.controls.name.data"
          class=":uno: rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          placeholder="Jane Doe"
          @blur="userForm.controls.name.transform(); userForm.controls.name.validate()"
        >
        <span v-if="userForm.controls.name.error" class=":uno: text-xs text-red-500">
          {{ userForm.controls.name.error.message }}
        </span>
      </label>

      <label class=":uno: flex flex-col gap-1 text-sm">
        <span class=":uno: vtext-1">Email</span>
        <input
          v-model="userForm.controls.email.data"
          class=":uno: rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          placeholder="jane@example.com"
          @blur="userForm.controls.email.validate()"
        >
        <span v-if="userForm.controls.email.error" class=":uno: text-xs text-red-500">
          {{ userForm.controls.email.error.message }}
        </span>
      </label>

      <label class=":uno: flex flex-col gap-1 text-sm">
        <span class=":uno: vtext-1">Age (18–99)</span>
        <input
          v-model.number="userForm.controls.age.data"
          type="number"
          class=":uno: rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          @blur="userForm.controls.age.validate()"
        >
        <span v-if="userForm.controls.age.error" class=":uno: text-xs text-red-500">
          {{ userForm.controls.age.error.message }}
        </span>
      </label>

      <fieldset class=":uno: flex flex-col gap-3 rounded border border-gray-200 p-3 dark:border-gray-700">
        <legend class=":uno: px-1 text-xs font-semibold vtext-1">
          Address (nested group)
        </legend>

        <label class=":uno: flex flex-col gap-1 text-sm">
          <span class=":uno: vtext-1">City</span>
          <input
            v-model="addressForm.controls.city.data"
            class=":uno: rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            @blur="addressForm.controls.city.validate()"
          >
          <span v-if="addressForm.controls.city.error" class=":uno: text-xs text-red-500">
            {{ addressForm.controls.city.error.message }}
          </span>
        </label>

        <label class=":uno: flex flex-col gap-1 text-sm">
          <span class=":uno: vtext-1">Street</span>
          <input
            v-model="addressForm.controls.street.data"
            class=":uno: rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          >
        </label>
      </fieldset>

      <div class=":uno: flex flex-wrap gap-3">
        <DButton color="primary" :disabled="isDisabled" @click="executeSubmit">
          {{ isLoading ? "Submitting…" : "Submit" }}
        </DButton>
        <DButton @click="fillExample">
          Patch example data
        </DButton>
        <DButton @click="userForm.reset()">
          Reset
        </DButton>
      </div>
    </section>

    <section class=":uno: flex max-w-xl flex-col gap-3">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        Live form data
      </h2>
      <pre class=":uno: overflow-x-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">{{ JSON.stringify(userForm.data.value, null, 2) }}</pre>

      <template v-if="submitted">
        <h2 class=":uno: text-sm font-semibold vtext-1">
          Last submitted payload
        </h2>
        <pre class=":uno: overflow-x-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">{{ submitted }}</pre>
      </template>
    </section>
  </div>
</template>
