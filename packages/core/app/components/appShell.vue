<script setup lang="ts">
// Placeholder admin shell to seed @director/core and demonstrate the layer chain
// (core → ui → common). Replace with the real administration building blocks.
defineProps<{ title?: string }>();
</script>

<template>
  <div class="min-h-screen vbg-ui-bg vtext-ui-text">
    <header class="flex items-center gap-3 border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <span class="text-lg font-semibold">{{ title ?? "Director" }}</span>
    </header>
    <main class="p-6">
      <slot />
    </main>
  </div>
</template>
