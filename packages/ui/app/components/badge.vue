<script setup lang="ts">
import type { DBadgeProps } from "./badge.types";
import { badgeStyleVariants } from "./badge.variants";

defineProps<DBadgeProps>();
</script>

<template>
  <span :class="badgeStyleVariants({ variant, color, size })">
    <slot name="leading" />
    <span class=":uno: pt-[1px]"><slot>{{ label }}</slot></span>
    <slot name="trailing" />
  </span>
</template>
