<script setup lang="ts">
import { ref } from "vue";

import { useDateFormControl } from "#layers/director-forms/app/composables/useDateFormControl";
import { useFormControl } from "#layers/director-forms/app/composables/useFormControl";
import { useFormGroup } from "#layers/director-forms/app/composables/useFormGroup";
import { useFormSubmit } from "#layers/director-forms/app/composables/useFormSubmit";
import { stringTrimTransformer } from "#layers/director-forms/app/transformers";
import {
  emailValidator,
  numberRangeValidator,
  requiredValidator,
  stringMinLengthValidator,
} from "#layers/director-forms/app/validators";

const roleItems = [
  { label: "Administrator", value: "admin" },
  { label: "Editor", value: "editor" },
  { label: "Viewer", value: "viewer" },
  { label: "Owner (taken)", value: "owner", disabled: true },
];

const profileForm = useFormGroup({
  name: useFormControl<string>("", {
    validators: [requiredValidator()],
    lazyTransformers: [stringTrimTransformer],
  }),
  email: useFormControl<string>("", { validators: [requiredValidator(), emailValidator()] }),
  role: useFormControl<string | undefined>(undefined, { validators: [requiredValidator()] }),
  seats: useFormControl<number>(1, { validators: [numberRangeValidator(1, 50)] }),
  newsletter: useFormControl<boolean>(false),
  otp: useFormControl<string>("", { validators: [stringMinLengthValidator(5)] }),
  birthday: useDateFormControl(null, { validators: [requiredValidator()] }),
  starts: useDateFormControl(null),
  standup: useFormControl<string | null>("09:30"),
});

const submitted = ref<string | null>(null);

const { isDisabled, isLoading, executeSubmit } = useFormSubmit(profileForm, async () => {
  // Pretend to talk to an API so the pending state is visible.
  await new Promise(resolve => setTimeout(resolve, 800));

  return () => {
    submitted.value = JSON.stringify(profileForm.data.value, null, 2);
  };
});
</script>

<template>
  <div class=":uno: flex flex-col gap-8">
    <p class=":uno: text-gray-600 dark:text-gray-300">
      <code>@director/form-ui</code> demo — <code>DForm*</code> components binding
      <code>@director/forms</code> controls to the <code>@director/ui</code> inputs.
    </p>

    <section class=":uno: grid max-w-3xl grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
      <DFormInput
        :control="profileForm.controls.name"
        label="Name"
        placeholder="Jane Doe"
        description="Trimmed on blur."
        required
      />

      <DFormInput
        :control="profileForm.controls.email"
        label="Email"
        type="email"
        placeholder="jane@example.com"
        hint="Work address"
        required
      />

      <DFormSelect
        :control="profileForm.controls.role"
        label="Role"
        placeholder="Pick a role"
        :items="roleItems"
        required
      />

      <DFormInputNumber
        :control="profileForm.controls.seats"
        label="Seats"
        help="Between 1 and 50."
        :min="1"
        :max="50"
      />

      <DFormDateField
        :control="profileForm.controls.birthday"
        label="Birthday"
        required
      />

      <DFormDatePicker
        :control="profileForm.controls.starts"
        label="Starts"
        help="Date field with a calendar popover."
      />

      <DFormTimeField
        :control="profileForm.controls.standup"
        label="Daily standup"
        help="Stored as an HH:mm string."
      />

      <DFormPinInput
        :control="profileForm.controls.otp"
        label="Invite code"
        :length="5"
        otp
      />

      <DFormSwitch
        :control="profileForm.controls.newsletter"
        label="Newsletter"
        switch-label="Send me product updates"
      />
    </section>

    <div class=":uno: flex flex-wrap gap-3">
      <DButton
        color="primary"
        :disabled="isDisabled"
        @click="executeSubmit"
      >
        {{ isLoading ? "Submitting…" : "Submit" }}
      </DButton>
      <DButton @click="profileForm.reset()">
        Reset
      </DButton>
    </div>

    <section class=":uno: flex max-w-3xl flex-col gap-3">
      <h2 class=":uno: text-sm font-semibold vtext-1">
        Live form data
      </h2>
      <pre class=":uno: overflow-x-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">{{ JSON.stringify(profileForm.data.value, null, 2) }}</pre>

      <template v-if="submitted">
        <h2 class=":uno: text-sm font-semibold vtext-1">
          Last submitted payload
        </h2>
        <pre class=":uno: overflow-x-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">{{ submitted }}</pre>
      </template>
    </section>
  </div>
</template>
