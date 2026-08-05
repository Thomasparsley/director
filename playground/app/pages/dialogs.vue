<script setup lang="ts">
import { ref } from "vue";

import { useModalDialog } from "#layers/director-dialogs/app/composables/useDialog";

import OuterDialog from "../components/OuterDialog.vue";
import PickerDialog from "../components/PickerDialog.vue";

const result = ref<string | null>(null);

// A nested dialog opened from inside another; closes itself on any pick.
const nested = useModalDialog<undefined, { choose: [value: string] }>(PickerDialog, {
  isCloseable: true,
  emits: { choose: () => nested.closeDialog() },
});

// The outer dialog of the stack; its button opens `nested` on top.
const outer = useModalDialog<undefined, { openNested: [] }>(OuterDialog, {
  isCloseable: true,
  emits: { openNested: () => nested.openDialog() },
});

// A dialog that resolves a value back to this opener via its emit handler.
const picker = useModalDialog<undefined, { choose: [value: string] }>(PickerDialog, {
  isCloseable: true,
  emits: {
    choose: (value: string) => {
      result.value = value;
      picker.closeDialog();
    },
  },
});
</script>

<template>
  <div class=":uno: flex flex-col gap-6">
    <h2 class=":uno: text-sm font-semibold vtext-1">
      Modal dialogs
    </h2>
    <p class=":uno: text-gray-600 dark:text-gray-300">
      <code>@directorkit/dialogs</code> demo — <code>useModalDialog</code> registers state with
      the manager; the app's <code>DialogHost</code> paints <code>manager.instances</code>.
    </p>

    <div class=":uno: flex flex-wrap gap-3">
      <DButton
        color="primary"
        @click="picker.openDialog()"
      >
        Open picker
      </DButton>
      <DButton @click="outer.openDialog()">
        Open stack
      </DButton>
    </div>

    <p
      v-if="result"
      class=":uno: text-sm vtext-2"
    >
      You picked: <strong>{{ result }}</strong>
    </p>
  </div>
</template>
