import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import Card from "./card.vue";
import { cardDescriptionVariants, cardTitleVariants, cardVariants } from "./card.variants";

describe("cardVariants", () => {
  it("applies the outline surface when no variant is passed", () => {
    const result = cardVariants({});

    expect(result).toContain("bg-white/70");
    expect(result).toContain("ring-1");
  });

  it("treats an explicitly undefined variant as unset rather than as a missing key", () => {
    expect(cardVariants({ variant: undefined })).toBe(cardVariants({}));
  });

  it("draws dividers between sections on every variant", () => {
    expect(cardVariants({ variant: "soft" })).toContain("divide-y");
    expect(cardVariants({ variant: "soft" })).toContain("divide-black/6");
  });

  it("inverts the divider on the solid surface, which is the only opaque one", () => {
    expect(cardVariants({ variant: "solid" })).toContain("bg-gray-900");
    expect(cardVariants({ variant: "solid" })).toContain("divide-white/15");
  });

  it("gives soft no ring, so it reads as elevation rather than as an edge", () => {
    expect(cardVariants({ variant: "soft" })).not.toContain("ring-1");
    expect(cardVariants({ variant: "subtle" })).toContain("ring-1");
  });
});

describe("cardTitleVariants / cardDescriptionVariants", () => {
  it("uses the mode-aware text ramp on the translucent surfaces", () => {
    expect(cardTitleVariants({ variant: "outline" })).toContain("vtext-1");
    expect(cardDescriptionVariants({ variant: "outline" })).toContain("vtext-3");
  });

  it("spells out both modes on solid, which inverts against the colour mode", () => {
    expect(cardTitleVariants({ variant: "solid" })).toContain("text-white");
    expect(cardTitleVariants({ variant: "solid" })).toContain("dark:text-gray-900");
  });
});

describe("dCard", () => {
  it("renders the default slot as the body", () => {
    const wrapper = mount(Card, { slots: { default: "body content" } });

    expect(wrapper.text()).toBe("body content");
  });

  it("omits the header entirely when there is nothing to put in it", () => {
    const wrapper = mount(Card, { slots: { default: "body" } });

    expect(wrapper.find("h3").exists()).toBe(false);
    // Body only: one child, so `divide-y` draws no line.
    expect(wrapper.element.children).toHaveLength(1);
  });

  it("renders the title and description props into the header", () => {
    const wrapper = mount(Card, {
      props: { title: "Members", description: "Everyone in the club" },
      slots: { default: "body" },
    });

    expect(wrapper.find("h3").text()).toBe("Members");
    expect(wrapper.find("p").text()).toBe("Everyone in the club");
  });

  it("renders the header without a body when only a title is given", () => {
    const wrapper = mount(Card, { props: { title: "Members" } });

    expect(wrapper.find("h3").exists()).toBe(true);
    expect(wrapper.element.children).toHaveLength(1);
  });

  it("honours titleLevel, so a decorative card need not inject a heading", () => {
    const wrapper = mount(Card, { props: { title: "Members", titleLevel: "p" } });

    expect(wrapper.find("h3").exists()).toBe(false);
    expect(wrapper.find("p").text()).toBe("Members");
  });

  it("prefers the title and description slots over the props", () => {
    const wrapper = mount(Card, {
      props: { title: "ignored", description: "also ignored" },
      slots: { title: "from-slot", description: "desc-slot" },
    });

    expect(wrapper.text()).toContain("from-slot");
    expect(wrapper.text()).toContain("desc-slot");
    expect(wrapper.text()).not.toContain("ignored");
  });

  it("lets the header slot replace the whole title/description block", () => {
    const wrapper = mount(Card, {
      props: { title: "ignored" },
      slots: { header: "<nav>custom</nav>" },
    });

    expect(wrapper.find("nav").text()).toBe("custom");
    expect(wrapper.text()).not.toContain("ignored");
  });

  it("renders the footer only when the slot is given", () => {
    expect(mount(Card, { slots: { default: "body" } }).element.children).toHaveLength(1);

    const wrapper = mount(Card, { slots: { default: "body", footer: "actions" } });

    expect(wrapper.element.children).toHaveLength(2);
    expect(wrapper.text()).toContain("actions");
  });

  it("renders as the element given by `as`", () => {
    const wrapper = mount(Card, { props: { as: "article" }, slots: { default: "body" } });

    expect(wrapper.element.tagName).toBe("ARTICLE");
  });

  it("reflects the variant in the root class list", () => {
    const wrapper = mount(Card, { props: { variant: "solid" }, slots: { default: "body" } });

    expect(wrapper.classes().join(" ")).toContain("bg-gray-900");
  });
});
