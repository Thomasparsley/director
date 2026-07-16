<script setup lang="ts">
import { computed, useId } from "vue";

import type { DFormFieldProps } from "./formField.types";
import { provideFormFieldContext } from "./formField.context";
import { formFieldLabelVariants, formFieldTextVariants } from "./formField.variants";

const props = defineProps<DFormFieldProps>();

const generatedId = useId();
const id = computed(() => props.id ?? generatedId);
const invalid = computed(() => Boolean(props.error));

provideFormFieldContext({
  id,
  invalid,
  size: computed(() => props.size),
});
</script>

<template>
  <div class=":uno: flex flex-col gap-1">
    <div
      v-if="label || hint || $slots.label || $slots.hint"
      class=":uno: flex items-baseline justify-between gap-2"
    >
      <label
        :for="id"
        :class="formFieldLabelVariants({ size, invalid, disabled })"
      >
        <slot name="label">{{ label }}</slot>
        <span
          v-if="required"
          class=":uno: text-error-500"
          aria-hidden="true"
        > *</span>
      </label>

      <span
        v-if="hint || $slots.hint"
        :class="formFieldTextVariants({ kind: 'hint' })"
      >
        <slot name="hint">{{ hint }}</slot>
      </span>
    </div>

    <p
      v-if="description || $slots.description"
      :class="formFieldTextVariants({ kind: 'description' })"
    >
      <slot name="description">{{ description }}</slot>
    </p>

    <slot />

    <p
      v-if="error"
      :class="formFieldTextVariants({ kind: 'error' })"
      role="alert"
    >
      <slot
        name="error"
        :error="error"
      >{{ error }}</slot>
    </p>
    <p
      v-else-if="help || $slots.help"
      :class="formFieldTextVariants({ kind: 'help' })"
    >
      <slot name="help">{{ help }}</slot>
    </p>
  </div>
</template>
