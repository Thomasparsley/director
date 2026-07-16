import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import { mountNavigation } from "../../test/mount";
import type { DNavigationItem, DNavigationSection } from "../types/navigation";

const IconHouse = defineComponent({
  name: "IconHouse",
  setup: () => () => h("svg", { "data-test": "icon-house" }),
});

const sectionsOf = (items: Array<DNavigationItem>): Array<DNavigationSection> => [
  { key: "s", groups: [{ key: "g", items }] },
];

/** Popovers and tooltips teleport to <body>, which persists between mounts. */
afterEach(() => {
  document.body.innerHTML = "";
});

describe("dNavigation — structure", () => {
  it("renders a link per item, with resolved hrefs", async () => {
    const { wrapper } = await mountNavigation({
      sections: sectionsOf([
        { label: "Dashboard", to: "/" },
        { label: "Clubs", to: "/clubs" },
      ]),
    });

    const links = wrapper.findAll("nav a");

    expect(links.map(l => l.text())).toEqual(["Dashboard", "Clubs"]);
    expect(links.map(l => l.attributes("href"))).toEqual(["/", "/clubs"]);
  });

  it("accepts the items shorthand as a single unlabelled group", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Clubs", to: "/clubs" }],
    });

    expect(wrapper.findAll("nav a")).toHaveLength(1);
    expect(wrapper.find("nav a").text()).toBe("Clubs");
  });

  it("ignores the items shorthand when sections is also passed", async () => {
    const { wrapper } = await mountNavigation({
      sections: sectionsOf([{ label: "FromSections", to: "/a" }]),
      items: [{ label: "FromItems", to: "/b" }],
    });

    expect(wrapper.findAll("nav a").map(l => l.text())).toEqual(["FromSections"]);
  });

  it("renders an empty nav rather than throwing when given nothing", async () => {
    const { wrapper } = await mountNavigation({});

    expect(wrapper.find("nav").exists()).toBe(true);
    expect(wrapper.findAll("nav a")).toHaveLength(0);
  });

  it("renders the aria-label on the nav landmark", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "A", to: "/a" }],
      ariaLabel: "Main",
    });

    expect(wrapper.find("nav").attributes("aria-label")).toBe("Main");
  });

  it("renders a group heading when expanded", async () => {
    const { wrapper } = await mountNavigation({
      sections: [{ key: "s", groups: [{ key: "g", label: "Firesport", items: [{ label: "A", to: "/a" }] }] }],
    });

    expect(wrapper.text()).toContain("Firesport");
    expect(wrapper.find("hr").exists()).toBe(false);
  });

  it("swaps the group heading for a divider when collapsed", async () => {
    const { wrapper } = await mountNavigation({
      sections: [{ key: "s", groups: [{ key: "g", label: "Firesport", items: [{ label: "A", to: "/a" }] }] }],
      collapsed: true,
    });

    const rule = wrapper.find("hr");

    expect(rule.exists()).toBe(true);
    expect(rule.attributes("aria-label")).toBe("Firesport");
  });

  it("omits skipped items from the rendered output", async () => {
    const { wrapper } = await mountNavigation({
      items: [
        { label: "Shown", to: "/a" },
        { label: "Hidden", to: "/b", skipIf: true },
      ],
    });

    expect(wrapper.findAll("nav a").map(l => l.text())).toEqual(["Shown"]);
  });

  it("reacts to a skipIf ref flipping at runtime", async () => {
    const hidden = ref(true);
    const { wrapper } = await mountNavigation({
      items: [
        { label: "Shown", to: "/a" },
        { label: "Toggled", to: "/b", skipIf: hidden },
      ],
    });

    expect(wrapper.findAll("nav a")).toHaveLength(1);

    hidden.value = false;
    await nextTick();

    expect(wrapper.findAll("nav a").map(l => l.text())).toEqual(["Shown", "Toggled"]);
  });
});

describe("dNavigation — item chrome", () => {
  it("renders an icon component", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Home", to: "/", icon: IconHouse }],
    });

    expect(wrapper.find("[data-test=\"icon-house\"]").exists()).toBe(true);
  });

  it("treats a string badge as shorthand for a label", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Leagues", to: "/l", badge: "12" }],
    });

    expect(wrapper.text()).toContain("12");
  });

  it("renders a numeric badge", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Leagues", to: "/l", badge: 7 }],
    });

    expect(wrapper.text()).toContain("7");
  });

  it("passes a badge object through, colour and all", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Leagues", to: "/l", badge: { label: "3", color: "primary" } }],
    });

    expect(wrapper.html()).toContain("bg-primary-500/15");
    expect(wrapper.text()).toContain("3");
  });

  it("treats chip: true as a bare dot", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Events", to: "/e", chip: true }],
    });

    // Default chip colour, and no text content beyond the label.
    expect(wrapper.html()).toContain("bg-primary-500");
    expect(wrapper.find("nav a").text()).toBe("Events");
  });

  it("renders chip text when the chip carries a count", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Events", to: "/e", chip: { color: "success", text: 4 } }],
    });

    expect(wrapper.text()).toContain("4");
    expect(wrapper.html()).toContain("bg-success-500");
  });

  it("renders no chip when chip is false", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Events", to: "/e", chip: false }],
    });

    expect(wrapper.html()).not.toContain("bg-primary-500");
  });

  it("renders a chevron on an item with children, and none on a leaf", async () => {
    const { wrapper } = await mountNavigation({
      items: [
        { label: "Parent", children: [{ label: "Child", to: "/c" }] },
        { label: "Leaf", to: "/leaf" },
      ],
    });

    expect(wrapper.findAll("[data-test=\"chevron\"]")).toHaveLength(1);
  });

  it("lets trailingIcon override the chevron", async () => {
    const { wrapper } = await mountNavigation({
      items: [{
        label: "Parent",
        trailingIcon: IconHouse,
        children: [{ label: "Child", to: "/c" }],
      }],
    });

    expect(wrapper.find("[data-test=\"icon-house\"]").exists()).toBe(true);
    expect(wrapper.find("[data-test=\"chevron\"]").exists()).toBe(false);
  });

  it("renders a disabled item as a span, never as a link", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Tools", to: "/tools", disabled: true }],
    });

    expect(wrapper.findAll("nav a")).toHaveLength(0);
    expect(wrapper.find("nav li span").exists()).toBe(true);
    expect(wrapper.html()).toContain("cursor-not-allowed");
  });

  it("renders an item with no target as a span", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Heading" }],
    });

    expect(wrapper.findAll("nav a")).toHaveLength(0);
    expect(wrapper.text()).toContain("Heading");
  });
});

describe("dNavigation — active state", () => {
  it("marks the matching item with aria-current and the active style", async () => {
    const { wrapper } = await mountNavigation(
      { items: [{ label: "Clubs", to: "/clubs" }, { label: "Events", to: "/events" }] },
      { path: "/clubs" },
    );

    const active = wrapper.findAll("nav a").filter(l => l.attributes("aria-current") === "page");

    expect(active).toHaveLength(1);
    expect(active[0]?.text()).toBe("Clubs");
    expect(active[0]?.classes().join(" ")).toContain("bg-white/65");
  });

  it("keeps a parent link lit on a deeper route with no entry of its own", async () => {
    const { wrapper } = await mountNavigation(
      { items: [{ label: "Clubs", to: "/clubs" }] },
      { path: "/clubs/42" },
    );

    expect(wrapper.find("nav a").attributes("aria-current")).toBe("page");
  });

  it("lights exactly one item when a sibling shares its path prefix", async () => {
    const { wrapper } = await mountNavigation(
      {
        items: [
          { label: "Parent", defaultOpen: true, children: [
            { label: "All", to: "/leagues" },
            { label: "Mine", to: "/leagues/mine" },
          ] },
        ],
      },
      { path: "/leagues/mine" },
    );

    const active = wrapper.findAll("nav a").filter(l => l.attributes("aria-current") === "page");

    expect(active.map(l => l.text())).toEqual(["Mine"]);
  });

  it("marks nothing active when the route matches no item", async () => {
    const { wrapper } = await mountNavigation(
      { items: [{ label: "Clubs", to: "/clubs" }] },
      { path: "/elsewhere" },
    );

    expect(wrapper.find("nav a").attributes("aria-current")).toBeUndefined();
  });

  it("moves the highlight when the route changes", async () => {
    const { wrapper, router } = await mountNavigation(
      { items: [{ label: "A", to: "/a" }, { label: "B", to: "/b" }] },
      { path: "/a" },
    );

    await router.push("/b");
    await nextTick();

    const active = wrapper.findAll("nav a").filter(l => l.attributes("aria-current") === "page");

    expect(active.map(l => l.text())).toEqual(["B"]);
  });
});

describe("dNavigation — collapsing children (accordion)", () => {
  it("renders a parent as a trigger button, not a link, even when it has a target", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Parent", to: "/ignored", children: [{ label: "Child", to: "/c" }] }],
    });

    expect(wrapper.find("button").exists()).toBe(true);
    expect(wrapper.findAll("nav a")).toHaveLength(0);
  });

  it("keeps a branch collapsed by default", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Parent", children: [{ label: "Child", to: "/c" }] }],
    });

    expect(wrapper.find("button").attributes("aria-expanded")).toBe("false");
  });

  it("expands a branch on click and collapses it again", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Parent", children: [{ label: "Child", to: "/c" }] }],
    });

    const trigger = wrapper.find("button");

    await trigger.trigger("click");
    await nextTick();

    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(wrapper.findAll("nav a").map(l => l.text())).toEqual(["Child"]);

    await trigger.trigger("click");
    await nextTick();

    expect(trigger.attributes("aria-expanded")).toBe("false");
  });

  it("expands a branch flagged defaultOpen on mount", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Parent", defaultOpen: true, children: [{ label: "Child", to: "/c" }] }],
    });

    expect(wrapper.find("button").attributes("aria-expanded")).toBe("true");
  });

  it("auto-expands the branch that owns the route on a cold deep link", async () => {
    const { wrapper } = await mountNavigation(
      {
        items: [
          { label: "Parent", children: [{ label: "Child", to: "/parent/child" }] },
          { label: "Other", children: [{ label: "Elsewhere", to: "/other" }] },
        ],
      },
      { path: "/parent/child" },
    );

    const triggers = wrapper.findAll("button");

    expect(triggers[0]?.attributes("aria-expanded")).toBe("true");
    expect(triggers[1]?.attributes("aria-expanded")).toBe("false");
  });

  it("leaves a branch the user closed shut when the route moves elsewhere", async () => {
    const { wrapper, router } = await mountNavigation({
      items: [{ label: "Parent", defaultOpen: true, children: [{ label: "Child", to: "/c" }] }],
    });

    const trigger = wrapper.find("button");
    await trigger.trigger("click");
    await nextTick();

    expect(trigger.attributes("aria-expanded")).toBe("false");

    await router.push("/unrelated");
    await nextTick();

    // Route requires nothing here, so the user's choice must survive the navigation.
    expect(trigger.attributes("aria-expanded")).toBe("false");
  });

  it("supports several branches open at once", async () => {
    const { wrapper } = await mountNavigation({
      items: [
        { label: "One", defaultOpen: true, children: [{ label: "A", to: "/a" }] },
        { label: "Two", defaultOpen: true, children: [{ label: "B", to: "/b" }] },
      ],
    });

    expect(wrapper.findAll("button").map(b => b.attributes("aria-expanded"))).toEqual(["true", "true"]);
  });

  it("renders grandchildren when nested branches are open", async () => {
    const { wrapper } = await mountNavigation({
      items: [{
        label: "Parent",
        defaultOpen: true,
        children: [{ label: "Mid", defaultOpen: true, children: [{ label: "Deep", to: "/deep" }] }],
      }],
    });

    // The nested branch is a fresh accordion; open it to reach the leaf.
    const triggers = wrapper.findAll("button");
    await triggers[1]?.trigger("click");
    await nextTick();

    expect(wrapper.findAll("nav a").map(l => l.text())).toContain("Deep");
  });

  it("disables the trigger of a disabled parent", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Parent", disabled: true, children: [{ label: "Child", to: "/c" }] }],
    });

    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
  });
});

describe("dNavigation — collapsed rail", () => {
  it("hides labels visually but keeps them for screen readers", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Clubs", to: "/clubs", icon: IconHouse }],
      collapsed: true,
    });

    const srOnly = wrapper.find("nav a span.sr-only");

    expect(srOnly.exists()).toBe(true);
    expect(srOnly.text()).toBe("Clubs");
  });

  it("still renders the icon", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Clubs", to: "/clubs", icon: IconHouse }],
      collapsed: true,
    });

    expect(wrapper.find("[data-test=\"icon-house\"]").exists()).toBe(true);
  });

  it("drops the badge, which has nowhere to sit", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Leagues", to: "/l", icon: IconHouse, badge: "12" }],
      collapsed: true,
    });

    expect(wrapper.text()).not.toContain("12");
  });

  it("keeps the chip, riding on the icon", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Events", to: "/e", icon: IconHouse, chip: { color: "success" } }],
      collapsed: true,
    });

    expect(wrapper.html()).toContain("bg-success-500");
    // Overlaid rather than inline.
    expect(wrapper.html()).toContain("absolute");
  });

  it("renders a parent as a popover trigger instead of an accordion", async () => {
    const { wrapper } = await mountNavigation({
      items: [{ label: "Leagues", icon: IconHouse, children: [{ label: "All", to: "/leagues" }] }],
      collapsed: true,
    });

    const trigger = wrapper.find("button");

    expect(trigger.attributes("aria-haspopup")).toBe("dialog");
    expect(trigger.attributes("aria-expanded")).toBe("false");
  });

  it("opens the children in a flyout, headed by the parent label", async () => {
    const { wrapper } = await mountNavigation({
      items: [{
        label: "Leagues",
        icon: IconHouse,
        children: [{ label: "All leagues", to: "/leagues" }, { label: "Mine", to: "/leagues/mine" }],
      }],
      collapsed: true,
    });

    await wrapper.find("button").trigger("click");
    await nextTick();

    const dialog = document.body.querySelector("[role=\"dialog\"]");

    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain("Leagues");
    expect(dialog?.textContent).toContain("All leagues");
    expect(dialog?.textContent).toContain("Mine");
    expect(dialog?.querySelectorAll("a")).toHaveLength(2);
  });

  it("highlights a collapsed parent whose child owns the route", async () => {
    const { wrapper } = await mountNavigation(
      {
        items: [{ label: "Leagues", icon: IconHouse, children: [{ label: "Mine", to: "/leagues/mine" }] }],
        collapsed: true,
      },
      { path: "/leagues/mine" },
    );

    // The children are hidden, so the parent carries the highlight for them.
    expect(wrapper.find("button").classes().join(" ")).toContain("bg-white/65");
  });
});

describe("dNavigation — slots", () => {
  it("overrides every item's label through #item-label", async () => {
    const { wrapper } = await mountNavigation(
      { items: [{ label: "Clubs", to: "/clubs" }] },
      { slots: { "item-label": "<span>slotted: {{ params.item.label }}</span>" } },
    );

    expect(wrapper.text()).toContain("slotted: Clubs");
  });

  it("routes a single item through its own named slot, leaving the others alone", async () => {
    const { wrapper } = await mountNavigation(
      {
        items: [
          { label: "Clubs", to: "/clubs", slot: "custom" },
          { label: "Events", to: "/events" },
        ],
      },
      { slots: { "custom-label": "<span>CUSTOM</span>" } },
    );

    const links = wrapper.findAll("nav a");

    expect(links[0]?.text()).toBe("CUSTOM");
    expect(links[1]?.text()).toBe("Events");
  });

  it("replaces the group heading through #group-label", async () => {
    const { wrapper } = await mountNavigation(
      {
        sections: [{ key: "s", groups: [{ key: "g", label: "Firesport", items: [{ label: "A", to: "/a" }] }] }],
      },
      { slots: { "group-label": "<span>GROUP: {{ params.group.key }}</span>" } },
    );

    expect(wrapper.text()).toContain("GROUP: g");
  });

  it("forwards slots down into nested children", async () => {
    const { wrapper } = await mountNavigation(
      {
        items: [{ label: "Parent", defaultOpen: true, children: [{ label: "Child", to: "/c" }] }],
      },
      { slots: { "item-label": "<span>[{{ params.item.label }}]</span>" } },
    );

    expect(wrapper.text()).toContain("[Parent]");
    expect(wrapper.text()).toContain("[Child]");
  });
});
