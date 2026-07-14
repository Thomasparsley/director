<script setup lang="ts">
// Components are auto-imported from the layers:
//   <DAppShell> from @director/core, <DButton> from @director/ui.
</script>

<template>
  <DAppShell title="Director — Playground">
    <div class="flex flex-col gap-6">
      <p class="text-gray-600 dark:text-gray-300">
        Layer chain working: <code>@director/core → @director/ui → @director/common</code>
      </p>

      <div class="flex flex-wrap gap-3">
        <DButton>Default</DButton>
      </div>
    </div>
  </DAppShell>
</template>
