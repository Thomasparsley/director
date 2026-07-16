import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ButtonGroup from "./buttonGroup.vue";
import { buttonGroupVariants } from "./buttonGroup.variants";

describe("buttonGroupVariants", () => {
  it("squares the inner corners and rounds only the ends", () => {
    const result = buttonGroupVariants({});

    expect(result).toContain("[&>*]:rounded-none");
    expect(result).toContain("[&>*:first-child]:rounded-l-lg");
    expect(result).toContain("[&>*:last-child]:rounded-r-lg");
  });

  it("pulls each seam together so neighbouring rings overlap into one hairline", () => {
    expect(buttonGroupVariants({})).toContain("[&>*+*]:-ml-px");
    expect(buttonGroupVariants({ orientation: "vertical" })).toContain("[&>*+*]:-mt-px");
  });

  it("lifts the touched child above its neighbours so its ring draws unbroken", () => {
    const result = buttonGroupVariants({});

    expect(result).toContain("[&>*:hover]:z-10");
    expect(result).toContain("[&>*:focus-visible]:z-10");
  });

  it("rounds the top and bottom ends when vertical", () => {
    const result = buttonGroupVariants({ orientation: "vertical" });

    expect(result).toContain("flex-col");
    expect(result).toContain("[&>*:first-child]:rounded-t-lg");
    expect(result).toContain("[&>*:last-child]:rounded-b-lg");
  });
});

describe("dButtonGroup", () => {
  it("renders a div marked as a group", () => {
    const wrapper = mount(ButtonGroup);

    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.attributes("role")).toBe("group");
  });

  it("renders the element given by `as`", () => {
    expect(mount(ButtonGroup, { props: { as: "span" } }).element.tagName).toBe("SPAN");
  });

  it("names the cluster for screen readers", () => {
    expect(mount(ButtonGroup, { props: { label: "Fork options" } }).attributes("aria-label")).toBe("Fork options");
  });

  it("renders slot content", () => {
    const wrapper = mount(ButtonGroup, {
      slots: { default: "<button>Fork</button><button>More</button>" },
    });

    expect(wrapper.findAll("button")).toHaveLength(2);
  });
});
