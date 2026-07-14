<script setup lang="ts">
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  ":uno: inline-flex items-center justify-center rounded-md whitespace-nowrap font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:(ring-sky ring-offset-2) disabled:(cursor-not-allowed opacity-50)",
  {
    variants: {
      variant: {
        default: ":uno: text-sm",
        control:
          ":uno: border border-secondary-200 bg-white text-xs text-secondary-800 shadow-sm hover:bg-secondary-100 dark:(border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700)",
      },
      color: {
        default: "",
        primary: "",
        success: "",
        warning: "",
        danger: "",
      },
      size: {
        default: ":uno: h-10 px-4 py-2",
        xs: ":uno: h-6 rounded-md px-2 py-1 !text-xs",
        sm: ":uno: h-8 rounded-md px-3 py-1",
        lg: ":uno: h-11 rounded-md px-8",
        icon: ":uno: h-10 w-10",
        icon_sm: ":uno: h-8 w-8",
        icon_xs: ":uno: h-6 w-6",
        icon_xxs: ":uno: h-5 w-5",
      },
    },
    compoundVariants: [
      // Default variant
      { variant: "default", color: "default", className: ":uno: vbg-neutral vtext-neutral hover:bg-gray-200 dark:hover:bg-gray-700" },
      { variant: "default", color: "primary", className: ":uno: bg-primary-600 text-primary-50 hover:bg-primary-800" },
      { variant: "default", color: "success", className: ":uno: bg-green-100 vtext-green hover:bg-green-200 dark:(bg-green-700 hover:bg-green-600)" },
      { variant: "default", color: "warning", className: ":uno: bg-orange-100 text-orange-800 hover:bg-orange-200" },
      { variant: "default", color: "danger", className: ":uno: bg-error-100 text-error-800 hover:bg-error-200" },
    ],
  },
);

type ButtonType = "button" | "submit" | "reset";

type ButtonStyleParameters = NonNullable<Parameters<typeof buttonVariants>[0]>;

export interface UButtonProps {
  readonly variant?: ButtonStyleParameters["variant"]
  readonly size?: ButtonStyleParameters["size"]
  readonly color?: ButtonStyleParameters["color"]
  readonly as?: string
  readonly type?: ButtonType
  readonly disabled?: boolean
}

withDefaults(defineProps<UButtonProps>(), {
  variant: "default",
  size: "default",
  color: "default",
  as: "button",
  type: undefined,
});
</script>

<template>
  <component
    :is="as"
    :class="buttonVariants({ variant: variant, size: size, color: color })"
    :type
    :disabled
    v-bind="$attrs"
  >
    <slot />
  </component>
</template>
