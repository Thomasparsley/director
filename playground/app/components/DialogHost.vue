<script setup lang="ts">
// The consumer's rendering shell for @directorkit/dialogs. The layer holds state and hands us
// `manager.instances` (the dialogs worth painting, in open order); painting them — overlay,
// stacking, escape/overlay-to-close — is our job (ADR-0017: dialogs hold state, not paint).
// A minimal host on purpose: it proves the state contract, not a production modal.
import { onMounted, onUnmounted } from "vue";

import { useDialogManager } from "#layers/director-dialogs/app/composables/useDialogManager";

const manager = useDialogManager();
const dialogInstances = manager.instances;

type RenderEntry = (typeof dialogInstances)["value"][number];

function close(entry: RenderEntry): void {
  entry.instance.isOpen = false;
  manager.removeFromRender(entry.key);
}

// `props`/`emits` arrive typed as `unknown` off the manager (they were computed refs before the
// manager's ref deep-unwrapped them); normalize to the object shapes v-bind / v-on take.
function asProps(props: unknown): Record<string, unknown> {
  return (props ?? {}) as Record<string, unknown>;
}

function asListeners(emits: unknown): Record<string, (...args: Array<unknown>) => void> {
  return (emits ?? {}) as Record<string, (...args: Array<unknown>) => void>;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== "Escape") {
    return;
  }

  // Close the topmost open, closeable dialog.
  const open = dialogInstances.value.filter(e => e.instance.isOpen && e.instance.isCloseable);
  const top = open.at(-1);
  if (top) {
    close(top);
  }
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onUnmounted(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
  <template
    v-for="(entry, index) in dialogInstances"
    :key="entry.key"
  >
    <template v-if="entry.instance.isOpen">
      <div
        data-dialog-overlay
        class=":uno: fixed inset-0 bg-black/40"
        :style="{ zIndex: 100 + index * 2 }"
        @click="entry.instance.isCloseable && close(entry)"
      />
      <div
        role="dialog"
        aria-modal="true"
        class=":uno: fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
        :style="{ zIndex: 101 + index * 2 }"
      >
        <component
          :is="entry.instance.component"
          v-bind="asProps(entry.instance.props)"
          v-on="asListeners(entry.instance.emits)"
        />
      </div>
    </template>
  </template>
</template>
