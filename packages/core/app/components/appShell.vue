<script setup lang="ts">
// Placeholder admin shell to seed @director/core and demonstrate the layer chain
// (core → ui → common). Replace with the real administration building blocks.
defineProps<{ title?: string }>();
</script>

<template>
  <div class=":uno: min-h-screen bg-gray-50 text-gray-900 dark:(bg-gray-950 text-gray-50)">
    <header class=":uno: flex items-center gap-3 border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <span class=":uno: text-lg font-semibold">{{ title ?? "Director" }}</span>
    </header>
    <main class=":uno: p-6">
      <slot />
    </main>
  </div>
</template>
