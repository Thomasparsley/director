<script setup lang="ts">
// Dialog content whose button opens a second dialog on top of this one, so the demo can
// exercise the manager's stack.
defineEmits<{ openNested: [] }>();
</script>

<template>
  <div class=":uno: flex flex-col gap-3">
    <h2 class=":uno: text-sm font-semibold vtext-1">
      Outer dialog
    </h2>
    <DButton @click="$emit('openNested')">
      Open nested
    </DButton>
  </div>
</template>
