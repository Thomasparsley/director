<script setup lang="ts">
import { onMounted, ref } from "vue";

import { getRandomIntBetween } from "#layers/director-common/app/utils/math";

import type { DSkeletonProps } from "./skeleton.types";

const props = defineProps<DSkeletonProps>();

// Hydration-safe randomness: the server and the first client render both use the
// deterministic lower bound, and the width only randomizes after mount. Math.random()
// during render disagrees between server and client, and even useId-derived hashes drift —
// third parties (reka-ui) consume ids in a different order on each side.
const width = ref(props.rw ? `${props.rw[0]}rem` : undefined);

onMounted(() => {
  if (props.rw) {
    width.value = `${getRandomIntBetween(props.rw[0], props.rw[1])}rem`;
  }
});
</script>

<template>
  <div
    class=":uno: animate-pulse rounded-md bg-black/8 dark:bg-white/10"
    :style="{ width }"
  />
</template>
