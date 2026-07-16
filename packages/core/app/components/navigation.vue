<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { AccordionRoot, TooltipProvider } from "reka-ui";

import { navigationItemValue, useNavigation } from "../composables/useNavigation";
import type { DNavigationSection } from "../types/navigation";

import type { DNavigationProps } from "./navigation.types";

const props = withDefaults(defineProps<DNavigationProps>(), {
  sections: undefined,
  items: undefined,
  collapsed: false,
  tooltip: true,
  ariaLabel: undefined,
});

const normalizedSections = computed<Array<DNavigationSection>>(() => {
  if (props.sections) {
    return props.sections;
  }

  if (props.items) {
    return [{ key: "default", groups: [{ key: "default", items: props.items }] }];
  }

  return [];
});

const { visibleSections, openValues } = useNavigation(normalizedSections);

const groupId = (sectionKey: string, groupKey: string) => `${sectionKey}:${groupKey}`;

// Which accordion branches are expanded, per group. Seeded from the route (and `defaultOpen`),
// then owned by the user: we only ever add to it, so navigating never yanks open a branch the
// user deliberately closed.
const open = ref<Record<string, Array<string>>>({});

watch(openValues, (required) => {
  for (const [key, values] of Object.entries(required)) {
    open.value[key] = Array.from(new Set([...(open.value[key] ?? []), ...values]));
  }
}, { immediate: true, deep: true });
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <nav
      :aria-label="ariaLabel"
      :data-collapsed="collapsed ? '' : undefined"
      class=":uno: w-full"
    >
      <template
        v-for="section in visibleSections"
        :key="section.key"
      >
        <div
          v-for="group in section.groups"
          :key="groupId(section.key, group.key)"
          class=":uno: py-2"
        >
          <!-- Collapsed, a heading has nowhere to go — a rule keeps the grouping legible. -->
          <div
            v-if="group.label && !collapsed"
            class=":uno: mb-1.5 px-3 text-xs font-medium vtext-3"
          >
            <slot
              name="group-label"
              :group="group"
            >{{ group.label }}</slot>
          </div>
          <hr
            v-else-if="group.label && collapsed"
            class=":uno: mx-2.5 mb-2 border-black/10 dark:border-white/10"
            :aria-label="group.label"
          >

          <AccordionRoot
            as="ul"
            type="multiple"
            :model-value="open[groupId(section.key, group.key)] ?? []"
            class=":uno: flex flex-col gap-0.5"
            @update:model-value="(value) => open[groupId(section.key, group.key)] = value as Array<string>"
          >
            <DNavigationEntry
              v-for="item in group.items"
              :key="navigationItemValue(item)"
              :item="item"
              :collapsed="collapsed"
              :tooltip="tooltip"
            >
              <template
                v-for="(_, name) in $slots"
                #[name]="scope"
              >
                <slot
                  :name="name"
                  v-bind="scope ?? {}"
                />
              </template>
            </DNavigationEntry>
          </AccordionRoot>
        </div>
      </template>
    </nav>
  </TooltipProvider>
</template>
