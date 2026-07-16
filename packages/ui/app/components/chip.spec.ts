import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import Chip from "./chip.vue";
import { chipStyleVariants } from "./chip.variants";

describe("chipStyleVariants", () => {
  it("defaults to a primary md dot that is neither text nor overlay", () => {
    const result = chipStyleVariants({});

    expect(result).toContain("bg-primary-500");
    expect(result).toContain("h-2.5");
    expect(result).toContain("relative");
    expect(result).not.toContain("absolute");
  });

  it("widens the pip into a pill once it carries text", () => {
    expect(chipStyleVariants({ text: true })).toContain("min-w-4");
    expect(chipStyleVariants({ text: false })).not.toContain("min-w-4");
  });

  it("positions the pip in the corner only when it overlays content", () => {
    expect(chipStyleVariants({ overlay: true, size: "sm" })).toContain("-top-0.5");
    expect(chipStyleVariants({ overlay: false, size: "sm" })).not.toContain("-top-0.5");
  });
});

describe("dChip", () => {
  it("renders inline as a bare dot when standalone", () => {
    const wrapper = mount(Chip);
    const pip = wrapper.find("span > span");

    expect(pip.exists()).toBe(true);
    expect(pip.text()).toBe("");
    expect(pip.classes().join(" ")).toContain("relative");
    expect(pip.classes().join(" ")).not.toContain("absolute");
  });

  it("overlays the pip on the corner when it wraps content", () => {
    const wrapper = mount(Chip, { slots: { default: "<svg data-test=\"icon\" />" } });

    expect(wrapper.find("[data-test=\"icon\"]").exists()).toBe(true);
    expect(wrapper.find("span > span").classes().join(" ")).toContain("absolute");
  });

  it("renders text when given", () => {
    expect(mount(Chip, { props: { text: 4 } }).text()).toBe("4");
  });

  it("treats an empty string as no text, staying a dot", () => {
    const wrapper = mount(Chip, { props: { text: "" } });

    expect(wrapper.find("span > span").classes().join(" ")).not.toContain("min-w-4");
  });

  it("renders zero as text rather than swallowing it as falsy", () => {
    const wrapper = mount(Chip, { props: { text: 0 } });

    expect(wrapper.text()).toBe("0");
    expect(wrapper.find("span > span").classes().join(" ")).toContain("min-w-4");
  });

  it("hides the pip but keeps the wrapped content when show is false", () => {
    const wrapper = mount(Chip, {
      props: { show: false },
      slots: { default: "<svg data-test=\"icon\" />" },
    });

    expect(wrapper.find("[data-test=\"icon\"]").exists()).toBe(true);
    expect(wrapper.find("span > span").exists()).toBe(false);
  });

  it("reflects the colour prop", () => {
    const wrapper = mount(Chip, { props: { color: "success" } });

    expect(wrapper.find("span > span").classes().join(" ")).toContain("bg-success-500");
  });
});
