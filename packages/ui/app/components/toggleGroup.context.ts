import { computed, inject, provide, type ComputedRef } from "vue";

import type { ToggleGroupSize } from "./toggleGroup.types";

// DToggleGroup → DToggleGroupItem handshake, the same shape as formField.context: the root
// provides the size once and every item picks it up, so callers size the group rather than
// repeating `size` on each item. An item's own prop still wins, and the injection is
// optional — reka would already have thrown if an item were used outside a group.

export interface ToggleGroupContext {
  readonly size: ComputedRef<ToggleGroupSize | undefined>
}

const toggleGroupContextKey = Symbol("director:toggle-group");

export function provideToggleGroupContext(context: ToggleGroupContext): void {
  provide(toggleGroupContextKey, context);
}

interface ToggleGroupItemSizeProps {
  readonly size?: ToggleGroupSize
}

/** Merges an item's own size with the surrounding DToggleGroup's (the item's prop wins). */
export function useToggleGroupContext(props: ToggleGroupItemSizeProps): ToggleGroupContext {
  const group = inject<ToggleGroupContext | null>(toggleGroupContextKey, null);

  return {
    size: computed(() => props.size ?? group?.size.value),
  };
}
