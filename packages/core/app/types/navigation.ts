import type { Component, Ref } from "vue";
import type { RouteLocationRaw } from "vue-router";

import type { DBadgeProps } from "#layers/director-ui/app/components/badge.types";
import type { DChipProps } from "#layers/director-ui/app/components/chip.types";

/** Anything that can gate a section / group / item out of the tree. */
export type NavigationCondition = boolean | Ref<boolean>;

/** `badge: "12"` is shorthand for `badge: { label: "12" }`. */
export type DNavigationBadge = string | number | DBadgeProps;

/** `chip: true` is shorthand for a plain dot in the default colour. */
export type DNavigationChip = boolean | DChipProps;

export interface DNavigationItem {
  /** Already-translated label. This layer is i18n-agnostic — translate before you pass it in. */
  label: string
  /**
   * A component, not an icon name: `nuxt-lucide-icons` auto-imports icons rather than
   * registering them globally, so a string name could not be resolved at runtime.
   * `import { House } from "@lucide/vue"` then `icon: House`.
   * For a lazily loaded icon, pass `defineAsyncComponent(() => import("..."))`.
   */
  icon?: Component
  badge?: DNavigationBadge
  chip?: DNavigationChip
  /** Overrides the chevron shown on an item that has children. */
  trailingIcon?: Component
  /** Ignored when `children` is set — an item with children toggles rather than navigates. */
  to?: RouteLocationRaw
  target?: string
  children?: Array<DNavigationItem>
  /** Expand on mount. Parents of the active route expand automatically regardless. */
  defaultOpen?: boolean
  disabled?: boolean
  /** Accordion identity + slot key. Defaults to `label`. */
  value?: string
  /**
   * Renders this item through the `#<slot>-leading` / `#<slot>-label` / `#<slot>-trailing`
   * slots instead of the default `#item-*` ones.
   */
  slot?: string
  skipIf?: NavigationCondition
  metadata?: Record<string, unknown>
}

export interface DNavigationGroup {
  key: string
  /** Small heading above the group. Hidden in collapsed mode, replaced by a divider. */
  label?: string
  items?: Array<DNavigationItem>
  skipIf?: NavigationCondition
}

export interface DNavigationSection {
  key: string
  groups?: Array<DNavigationGroup>
  skipIf?: NavigationCondition
}
