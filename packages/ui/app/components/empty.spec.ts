import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import Empty from "./empty.vue";
import { iconStubs } from "../../test/icons";
import {
  emptyDescriptionVariants,
  emptyIconVariants,
  emptyTitleVariants,
  emptyVariants,
} from "./empty.variants";

describe("emptyVariants", () => {
  it("applies the outline / md combination when nothing is passed", () => {
    const result = emptyVariants({});

    expect(result).toContain("bg-white/70");
    expect(result).toContain("py-10");
  });

  it("treats an explicitly undefined variant as unset rather than as a missing key", () => {
    expect(emptyVariants({ variant: undefined })).toBe(emptyVariants({}));
  });

  it("paints no surface at all for the naked variant", () => {
    const result = emptyVariants({ variant: "naked" });

    expect(result).not.toContain("bg-white");
    expect(result).not.toContain("ring-1");
    // Layout and size survive — only the surface goes away.
    expect(result).toContain("flex-col");
    expect(result).toContain("py-10");
  });

  it.each([
    ["xs", "h-5 w-5", "text-xs"],
    ["sm", "h-6 w-6", "text-sm"],
    ["md", "h-8 w-8", "text-sm"],
    ["lg", "h-10 w-10", "text-base"],
    ["xl", "h-12 w-12", "text-lg"],
  ] as const)("scales the icon and the title together at %s", (size, icon, title) => {
    expect(emptyIconVariants({ size })).toContain(icon);
    expect(emptyTitleVariants({ size })).toContain(title);
  });

  it("mutes the icon and the description to the same tone", () => {
    expect(emptyIconVariants({ variant: "outline" })).toContain("vtext-3");
    expect(emptyDescriptionVariants({ variant: "outline" })).toContain("vtext-3");
  });

  it("inverts the text on solid, which is the only opaque surface", () => {
    expect(emptyTitleVariants({ variant: "solid" })).toContain("text-white");
    expect(emptyDescriptionVariants({ variant: "solid" })).toContain("text-white/70");
  });
});

describe("dEmpty", () => {
  it("renders the title and description props", () => {
    const wrapper = mount(Empty, {
      props: { title: "No projects", description: "Create one to get started." },
    });

    expect(wrapper.find("h3").text()).toBe("No projects");
    expect(wrapper.find("p").text()).toBe("Create one to get started.");
  });

  it("renders nothing but the box when it has no content", () => {
    expect(mount(Empty).text()).toBe("");
  });

  it("renders the icon component that was passed in", () => {
    const wrapper = mount(Empty, {
      props: { title: "No projects", icon: iconStubs.IconPlus },
    });

    expect(wrapper.find("[data-icon=\"IconPlus\"]").exists()).toBe(true);
  });

  it("sizes the icon through the class list, not the component's own size prop", () => {
    const wrapper = mount(Empty, { props: { icon: iconStubs.IconPlus, size: "xl" } });

    expect(wrapper.find("[data-icon=\"IconPlus\"]").classes().join(" ")).toContain("h-12 w-12");
  });

  it("prefers the leading slot over the icon prop", () => {
    const wrapper = mount(Empty, {
      props: { icon: iconStubs.IconPlus },
      slots: { leading: "<img alt=\"custom\">" },
    });

    expect(wrapper.find("img").exists()).toBe(true);
    expect(wrapper.find("[data-icon=\"IconPlus\"]").exists()).toBe(false);
  });

  it("prefers the title and description slots over the props", () => {
    const wrapper = mount(Empty, {
      props: { title: "ignored", description: "also ignored" },
      slots: { title: "from-slot", description: "desc-slot" },
    });

    expect(wrapper.text()).toContain("from-slot");
    expect(wrapper.text()).toContain("desc-slot");
    expect(wrapper.text()).not.toContain("ignored");
  });

  it("honours titleLevel", () => {
    const wrapper = mount(Empty, { props: { title: "No projects", titleLevel: "h2" } });

    expect(wrapper.find("h2").text()).toBe("No projects");
    expect(wrapper.find("h3").exists()).toBe(false);
  });

  it("renders the actions slot only when it is given", () => {
    expect(mount(Empty, { props: { title: "t" } }).text()).toBe("t");

    const wrapper = mount(Empty, {
      props: { title: "t" },
      slots: { actions: "<button>Create</button>" },
    });

    expect(wrapper.find("button").text()).toBe("Create");
  });

  it("renders the default slot as the body, between the description and the actions", () => {
    const wrapper = mount(Empty, {
      props: { description: "desc" },
      slots: { default: "<span>body</span>", actions: "<button>go</button>" },
    });

    expect(wrapper.text()).toBe("descbodygo");
  });

  it("reflects variant and size in the root class list", () => {
    const wrapper = mount(Empty, { props: { variant: "naked", size: "xs" } });
    const classes = wrapper.classes().join(" ");

    expect(classes).toContain("py-6");
    expect(classes).not.toContain("bg-white");
  });
});
