import type { DNavigationItem, DNavigationSection } from "../types/navigation";

export interface DNavigationProps {
  /** Full section → group → item tree. Sections render in order, with no chrome of their own. */
  readonly sections?: Array<DNavigationSection>
  /** Shorthand for a single unlabelled group. Ignored when `sections` is passed. */
  readonly items?: Array<DNavigationItem>
  /** Icon-only rail: labels collapse to tooltips, children to flyouts. */
  readonly collapsed?: boolean
  /** Label tooltips while collapsed. */
  readonly tooltip?: boolean
  readonly ariaLabel?: string
}

export interface DNavigationEntryProps {
  readonly item: DNavigationItem
  readonly collapsed?: boolean
  /** Show a label tooltip in collapsed mode. Off inside the collapsed flyout. */
  readonly tooltip?: boolean
}

export interface DNavigationEntryBodyProps {
  readonly item: DNavigationItem
  readonly collapsed?: boolean
  /** Drives the chevron rotation on items that have children. */
  readonly open?: boolean
}

/** Scope handed to every `#item-*` (and per-item `#<slot>-*`) slot. */
export interface DNavigationSlotProps {
  readonly item: DNavigationItem
  readonly collapsed?: boolean
  readonly open?: boolean
}

/** Scope handed to `#group-label`. */
export interface DNavigationGroupSlotProps {
  readonly group: NonNullable<DNavigationSection["groups"]>[number]
}
