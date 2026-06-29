<script setup lang="ts">
import DButton from "./button.vue";

const variants = ["solid", "outline", "ghost"] as const;
const colors = ["primary", "secondary", "error"] as const;
</script>

<template>
  <Story title="DButton">
    <Variant title="Variants × colors">
      <div class="flex flex-col gap-3 p-4">
        <div v-for="variant in variants" :key="variant" class="flex gap-3">
          <DButton v-for="color in colors" :key="color" :variant="variant" :color="color">
            {{ variant }} / {{ color }}
          </DButton>
        </div>
      </div>
    </Variant>

    <Variant title="Sizes">
      <div class="flex items-center gap-3 p-4">
        <DButton size="sm">Small</DButton>
        <DButton size="md">Medium</DButton>
        <DButton size="lg">Large</DButton>
      </div>
    </Variant>

    <Variant title="Disabled">
      <div class="p-4">
        <DButton disabled>Disabled</DButton>
      </div>
    </Variant>
  </Story>
</template>
