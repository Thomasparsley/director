<script setup lang="ts">
// Dialog content that returns a value to its opener by emitting it — the manager never
// sees the value; the opener's `emits` handler does.
defineEmits<{ choose: [value: string] }>();
</script>

<template>
  <div class=":uno: flex flex-col gap-3">
    <h2 class=":uno: text-sm font-semibold vtext-1">
      Pick a fruit
    </h2>
    <div class=":uno: flex gap-2">
      <DButton @click="$emit('choose', 'apple')">
        Apple
      </DButton>
      <DButton @click="$emit('choose', 'banana')">
        Banana
      </DButton>
    </div>
  </div>
</template>
