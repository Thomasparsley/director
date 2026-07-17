import type { Component } from "vue";

import type { emptyVariants } from "./empty.variants";

type EmptyStyleParameters = NonNullable<Parameters<typeof emptyVariants>[0]>;

export type EmptyVariant = EmptyStyleParameters["variant"];
export type EmptySize = EmptyStyleParameters["size"];

/** Heading level for the empty state's title. See DCardProps["titleLevel"]. */
export type EmptyTitleLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";

export interface DEmptyProps {
  readonly variant?: EmptyVariant
  readonly size?: EmptySize
  /** Element or component to render as. */
  readonly as?: string
  /**
   * A component, not an icon name: `nuxt-lucide-icons` auto-imports icons rather than
   * registering them globally, so a string name could not be resolved at runtime.
   * `import { Inbox } from "@lucide/vue"` then `:icon="Inbox"`.
   */
  readonly icon?: Component
  /** Rendered as the heading. The `title` slot wins over it. */
  readonly title?: string
  /** Rendered under the title. The `description` slot wins over it. */
  readonly description?: string
  readonly titleLevel?: EmptyTitleLevel
}
