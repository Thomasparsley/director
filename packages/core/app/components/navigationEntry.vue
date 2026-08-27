<script setup lang="ts">
import { computed } from "vue";
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
  TooltipContent,
  TooltipPortal,
  TooltipRoot,
  TooltipTrigger,
} from "reka-ui";

// Imported rather than resolved from the string "NuxtLink": a dynamic `<component :is>` only
// resolves globally-registered names, and NuxtLink is not one — it renders as <nuxtlink>.
import { NuxtLink } from "#components";

import { navigationItemValue, useNavigationActive } from "../composables/useNavigation";

import type { DNavigationEntryProps, DNavigationSlotProps } from "./navigation.types";
import {
  navigationFlyoutClass,
  navigationLinkVariants,
  navigationTooltipClass,
} from "./navigation.variants";

const props = defineProps<DNavigationEntryProps>();

// This component renders itself for nested children, so inferring the forwarded slot types
// from usage would be circular (TS7022). Pinning the scope shape here breaks the cycle.
defineSlots<Record<string, (props: DNavigationSlotProps) => unknown>>();

const { isItemActive, hasActiveDescendant } = useNavigationActive();

const hasChildren = computed(() => (props.item.children?.length ?? 0) > 0);

const value = computed(() => navigationItemValue(props.item));

const active = computed(() => isItemActive(props.item));

const linkClass = computed(() => navigationLinkVariants({
  collapsed: props.collapsed,
  // Collapsed, a parent's children are hidden — so it carries the highlight for them.
  active: active.value || (props.collapsed === true && hasActiveDescendant(props.item)),
  disabled: props.item.disabled,
}));

// Only worth a tooltip when the label is otherwise invisible.
const showTooltip = computed(() => props.collapsed === true && props.tooltip !== false);
</script>

<template>
  <!--
    Parent, collapsed: no room for an accordion, so the children open in a flyout.
    Deliberately no tooltip here. Reka has no scoped popper contexts, so a TooltipRoot around
    the PopoverTrigger would capture it as the *tooltip's* anchor and leave the popover
    unanchored (floating-ui parks it off-screen). The flyout's own heading names the item.
  -->
  <li v-if="hasChildren && collapsed">
    <PopoverRoot>
      <PopoverTrigger
        :class="linkClass"
        :disabled="item.disabled"
      >
        <DNavigationEntryBody
          :item="item"
          :collapsed="collapsed"
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
        </DNavigationEntryBody>

        <span class=":uno: sr-only">{{ item.label }}</span>
      </PopoverTrigger>

      <PopoverPortal>
        <PopoverContent
          side="right"
          align="start"
          :side-offset="10"
          class="d-popover-content"
          :class="navigationFlyoutClass"
        >
          <p class=":uno: px-2.5 py-1 text-xs font-medium vtext-3">
            {{ item.label }}
          </p>

          <ul class=":uno: flex flex-col gap-0.5">
            <DNavigationEntry
              v-for="child in item.children"
              :key="navigationItemValue(child)"
              :item="child"
              :tooltip="false"
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
          </ul>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </li>

  <!-- Parent, expanded: accordion. An item with children toggles; its own `to` is ignored. -->
  <AccordionItem
    v-else-if="hasChildren"
    v-slot="{ open }"
    as="li"
    :value="value"
    :disabled="item.disabled"
  >
    <AccordionHeader as="div">
      <AccordionTrigger :class="linkClass">
        <DNavigationEntryBody
          :item="item"
          :collapsed="collapsed"
          :open="open"
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
        </DNavigationEntryBody>
      </AccordionTrigger>
    </AccordionHeader>

    <!-- `:uno:` has to open the literal — with the marker in the middle the transformer
         never fires and the whole string ships uncompiled, `:uno:` and all. The
         animation hook rides along: it is unknown to Uno, so `keepUnknown` keeps it
         next to the hashed class. -->
    <AccordionContent class=":uno: d-accordion-content of-hidden">
      <ul class=":uno: ml-4.5 mt-0.5 flex flex-col gap-0.5 border-l border-black/10 pl-2 dark:border-white/10">
        <DNavigationEntry
          v-for="child in item.children"
          :key="navigationItemValue(child)"
          :item="child"
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
      </ul>
    </AccordionContent>
  </AccordionItem>

  <!-- Leaf -->
  <li v-else>
    <TooltipRoot :disable-hoverable-content="true">
      <TooltipTrigger as-child>
        <component
          :is="item.to && !item.disabled ? NuxtLink : 'span'"
          :to="item.to"
          :target="item.target"
          :class="linkClass"
          :aria-current="active ? 'page' : undefined"
        >
          <DNavigationEntryBody
            :item="item"
            :collapsed="collapsed"
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
          </DNavigationEntryBody>

          <span
            v-if="collapsed"
            class=":uno: sr-only"
          >{{ item.label }}</span>
        </component>
      </TooltipTrigger>

      <TooltipPortal v-if="showTooltip">
        <TooltipContent
          side="right"
          :side-offset="8"
          :class="navigationTooltipClass"
        >
          {{ item.label }}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </li>
</template>

<style scoped>
/* The flyout blooms out of its trigger — reka exposes the popper origin as a CSS var. */
.d-popover-content {
  transform-origin: var(--reka-popover-content-transform-origin, left center);
}

.d-popover-content[data-state="open"] {
  animation: d-popover-in 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes d-popover-in {
  from {
    opacity: 0;
    transform: scale(0.94) translateX(-4px);
  }
}

/* Reka measures the panel and exposes its height, which is what makes the slide animatable. */
.d-accordion-content[data-state="open"] {
  animation: d-accordion-down 200ms ease-out;
}

.d-accordion-content[data-state="closed"] {
  animation: d-accordion-up 200ms ease-out;
}

@keyframes d-accordion-down {
  from { height: 0; }
  to { height: var(--reka-accordion-content-height); }
}

@keyframes d-accordion-up {
  from { height: var(--reka-accordion-content-height); }
  to { height: 0; }
}
</style>
