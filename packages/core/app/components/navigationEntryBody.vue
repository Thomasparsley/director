<script setup lang="ts">
import { computed } from "vue";

import type { DBadgeProps } from "#layers/director-ui/app/components/badge.types";
import type { DChipProps } from "#layers/director-ui/app/components/chip.types";

import type { DNavigationEntryBodyProps } from "./navigation.types";

const props = defineProps<DNavigationEntryBodyProps>();

// `slot: "foo"` on an item routes it through #foo-leading / #foo-label / #foo-trailing
// instead of the default #item-* slots.
const slotNames = computed(() => {
  const base = props.item.slot ?? "item";

  return {
    leading: `${base}-leading`,
    label: `${base}-label`,
    trailing: `${base}-trailing`,
  };
});

const icon = computed(() => props.item.icon);

const trailingIcon = computed(() => props.item.trailingIcon);

const badge = computed<DBadgeProps | undefined>(() => {
  const { badge } = props.item;

  if (badge === undefined) {
    return undefined;
  }

  return typeof badge === "object" ? badge : { label: badge };
});

const chip = computed<DChipProps | undefined>(() => {
  const { chip } = props.item;

  if (chip === undefined || chip === false) {
    return undefined;
  }

  return chip === true ? {} : chip;
});

const hasChildren = computed(() => (props.item.children?.length ?? 0) > 0);
</script>

<template>
  <slot
    :name="slotNames.leading"
    :item="item"
    :collapsed="collapsed"
  >
    <!-- Collapsed to an icon rail, the chip rides on the icon itself — there is no label to sit beside. -->
    <DChip
      v-if="icon"
      v-bind="collapsed && chip ? chip : undefined"
      :show="Boolean(collapsed && chip)"
      size="sm"
    >
      <component
        :is="icon"
        class=":uno: h-4.5 w-4.5 shrink-0"
        aria-hidden="true"
      />
    </DChip>
  </slot>

  <template v-if="!collapsed">
    <span class=":uno: flex-1 truncate text-left">
      <slot
        :name="slotNames.label"
        :item="item"
        :collapsed="collapsed"
      >{{ item.label }}</slot>
    </span>

    <slot
      :name="slotNames.trailing"
      :item="item"
      :collapsed="collapsed"
      :open="open"
    >
      <DChip
        v-if="chip"
        v-bind="chip"
        class=":uno: shrink-0"
      />

      <DBadge
        v-if="badge"
        v-bind="badge"
        size="xxs"
        class=":uno: shrink-0"
      />

      <component
        :is="trailingIcon"
        v-if="trailingIcon"
        class=":uno: h-4 w-4 shrink-0"
        aria-hidden="true"
      />
      <IconChevronRight
        v-else-if="hasChildren"
        class=":uno: h-4 w-4 shrink-0 op-50 transition-transform duration-200 group-hover:op-80"
        :class="open ? ':uno: rotate-90' : ''"
        aria-hidden="true"
      />
    </slot>
  </template>
</template>
