import type { cardVariants } from "./card.variants";

type CardStyleParameters = NonNullable<Parameters<typeof cardVariants>[0]>;

export type CardVariant = CardStyleParameters["variant"];

/** Heading level for the card's title. Never inferred — pick the one the page outline needs. */
export type CardTitleLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";

export interface DCardProps {
  readonly variant?: CardVariant
  /** Element or component to render as — e.g. "article" or "li". */
  readonly as?: string
  /** Rendered into the header. The `title` slot wins over it. */
  readonly title?: string
  /** Rendered under the title. The `description` slot wins over it. */
  readonly description?: string
  /**
   * The title's element. `h3` suits a card in a page section; drop to `p` when the card is
   * decorative and would otherwise inject a heading into the document outline.
   */
  readonly titleLevel?: CardTitleLevel
}
