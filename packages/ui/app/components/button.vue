<script setup lang="ts">
import { buttonVariants } from "../utils/cva/button";

type ButtonStyleParameters = NonNullable<Parameters<typeof buttonVariants>[0]>;

export interface DButtonProps {
  readonly variant?: ButtonStyleParameters["variant"]
  readonly color?: ButtonStyleParameters["color"]
  readonly size?: ButtonStyleParameters["size"]
  readonly as?: string
  readonly type?: "button" | "submit" | "reset"
  readonly disabled?: boolean
}

withDefaults(defineProps<DButtonProps>(), {
  variant: "solid",
  color: "primary",
  size: "md",
  as: "button",
  type: "button",
});
</script>

<template>
  <component
    :is="as"
    :class="buttonVariants({ variant, color, size })"
    :type="as === 'button' ? type : undefined"
    :disabled="disabled"
  >
    <slot />
  </component>
</template>
