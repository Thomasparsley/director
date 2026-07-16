<script setup lang="ts">
// Catch-all so every demo link in the sidebar resolves to a real route — that's what the
// navigation's active state and auto-expand are keyed off.
const route = useRoute();
</script>

<template>
  <div class=":uno: flex flex-col gap-2">
    <h1 class=":uno: text-lg font-semibold vtext-1">
      {{ route.path }}
    </h1>

    <p class=":uno: text-sm text-gray-600 dark:text-gray-300">
      Demo page. The sidebar entry for this route is highlighted, and its parent branch is
      expanded.
    </p>
  </div>
</template>
