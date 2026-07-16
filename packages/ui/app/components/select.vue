<script setup lang="ts" generic="T extends AcceptableValue">
// <DSelect> — a reka-ui listbox wearing the frosted control fill; the popup is the shared
// glass popover surface, so it matches the date picker and every future floating control.
import { computed } from "vue";
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
  type AcceptableValue,
} from "reka-ui";

import type { DSelectProps } from "./select.types";
import { controlPopoverVariants, controlVariants } from "./control.variants";
import { selectItemIndicatorVariants, selectItemVariants } from "./select.variants";
import { useFormFieldContext } from "./formField.context";

type Emits = {
  /** Re-emitted from reka so callers can validate when the listbox closes. */
  "update:open": [open: boolean]
};

const props = defineProps<DSelectProps<T>>();
const emits = defineEmits<Emits>();

const { id, invalid, size } = useFormFieldContext(props);

const model = defineModel<T>();

// reka's SelectValue only learns item labels once the listbox has mounted, so a closed
// select would render its value blank. The label lives in `items` — render it ourselves.
const selectedLabel = computed(() =>
  props.items.find(item => item.value === model.value)?.label,
);
</script>

<template>
  <SelectRoot
    v-model="model"
    :name
    :disabled
    :required
    @update:open="(open) => emits('update:open', open)"
  >
    <SelectTrigger
      :id
      :aria-invalid="invalid || undefined"
      :class="[
        controlVariants({ size, invalid }),
        ':uno: inline-flex items-center justify-between gap-2 text-left data-[placeholder]:text-gray-400 dark:data-[placeholder]:text-gray-500',
      ]"
    >
      <SelectValue
        :placeholder
        class=":uno: truncate"
      >
        {{ selectedLabel ?? placeholder }}
      </SelectValue>
      <SelectIcon class=":uno: shrink-0 text-gray-400 dark:text-gray-500">
        <IconChevronsUpDown class=":uno: h-3.5 w-3.5" />
      </SelectIcon>
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="4"
        :class="[controlPopoverVariants(), ':uno: w-[var(--reka-select-trigger-width)]']"
      >
        <SelectViewport class=":uno: p-1">
          <SelectItem
            v-for="item in items"
            :key="String(item.value)"
            :value="item.value"
            :disabled="item.disabled"
            :class="selectItemVariants()"
          >
            <SelectItemIndicator :class="selectItemIndicatorVariants()">
              <IconCheck class=":uno: h-3.5 w-3.5" />
            </SelectItemIndicator>
            <SelectItemText>
              <slot
                name="item"
                :item="item"
              >{{ item.label }}</slot>
            </SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
