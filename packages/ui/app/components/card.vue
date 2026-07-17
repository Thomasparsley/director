<script setup lang="ts">
// <DCard> — a panel with an optional header and footer, in the shape Nuxt UI's UCard has:
// `title`/`description` props for the common case, and a slot for every part when the
// common case is not enough. The header/body/footer are plain divs rather than separate
// <DCardHeader> components — the dividers come from `divide-y` on the root, so the parts
// have nothing to coordinate and no context to share.
import type { DCardProps } from "./card.types";
import {
  cardBodyVariants,
  cardDescriptionVariants,
  cardFooterVariants,
  cardHeaderVariants,
  cardTitleVariants,
  cardVariants,
} from "./card.variants";

withDefaults(defineProps<DCardProps>(), {
  as: "div",
  titleLevel: "h3",
});
</script>

<template>
  <component
    :is="as"
    :class="cardVariants({ variant })"
    v-bind="$attrs"
  >
    <div
      v-if="$slots.header || $slots.title || $slots.description || title || description"
      :class="cardHeaderVariants()"
    >
      <slot name="header">
        <component
          :is="titleLevel"
          v-if="$slots.title || title"
          :class="cardTitleVariants({ variant })"
        >
          <slot name="title">{{ title }}</slot>
        </component>

        <p
          v-if="$slots.description || description"
          :class="cardDescriptionVariants({ variant })"
        >
          <slot name="description">{{ description }}</slot>
        </p>
      </slot>
    </div>

    <div
      v-if="$slots.default"
      :class="cardBodyVariants()"
    >
      <slot />
    </div>

    <div
      v-if="$slots.footer"
      :class="cardFooterVariants()"
    >
      <slot name="footer" />
    </div>
  </component>
</template>
