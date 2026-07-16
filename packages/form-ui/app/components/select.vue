<script setup lang="ts" generic="T extends AcceptableValue">
// <DFormSelect> — DSelect driven by a FormControl; validates when the listbox closes,
// the select's equivalent of blur.
import type { AcceptableValue } from "reka-ui";

import DFormField from "#layers/director-ui/app/components/formField.vue";
import DSelect from "#layers/director-ui/app/components/select.vue";
import type { DSelectItem } from "#layers/director-ui/app/components/select.types";

import type { BaseFormBindingProps } from "../types/props";
import { useFormFields } from "../composables/useFormFields";

interface Props extends BaseFormBindingProps<T> {
  readonly items: Array<DSelectItem<T>>
  readonly placeholder?: string
  readonly name?: string
}

const props = defineProps<Props>();

const { fieldValue, fieldError } = useFormFields(props.control);

function onOpenChange(open: boolean) {
  if (!open) {
    props.control.transform();
    props.control.validate();
  }
}
</script>

<template>
  <DFormField
    :label
    :hint
    :description
    :help
    :required
    :disabled
    :size
    :error="fieldError?.message"
  >
    <DSelect
      v-model="fieldValue"
      :items
      :placeholder
      :name
      :disabled
      :required
      @update:open="onOpenChange"
    />
  </DFormField>
</template>
