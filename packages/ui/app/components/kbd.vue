<script setup lang="ts">
// <DKbd> — one keycap. Renders a real <kbd>, and translates named keys into the glyph the
// reader has in front of them (⌘ on a Mac, Ctrl elsewhere).
import { computed } from "vue";

import type { DKbdProps } from "./kbd.types";
import { kbdStyleVariants } from "./kbd.variants";
import { resolveKbdKey, useIsMac } from "./kbd.keys";

const props = defineProps<DKbdProps>();

const isMac = useIsMac();

const label = computed(() => resolveKbdKey(props.value, isMac.value));
</script>

<template>
  <kbd :class="kbdStyleVariants({ variant, size })">
    <slot>{{ label }}</slot>
  </kbd>
</template>
