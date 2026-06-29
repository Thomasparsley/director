<script setup lang="ts">
// Components are auto-imported from the layers:
//   <DAppShell> from @director/core, <DButton> from @director/ui.
</script>

<template>
  <DAppShell title="Director — Playground">
    <div class="flex flex-col gap-6">
      <p class="vtext-ui-text-2">
        Layer chain working: <code>@director/core → @director/ui → @director/common</code>
      </p>

      <div class="flex flex-wrap gap-3">
        <DButton variant="solid" color="primary">Primary</DButton>
        <DButton variant="outline" color="secondary">Secondary</DButton>
        <DButton variant="ghost" color="error">Error</DButton>
      </div>
    </div>
  </DAppShell>
</template>
