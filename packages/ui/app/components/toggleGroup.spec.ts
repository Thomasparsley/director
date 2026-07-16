import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { AcceptableValue } from "reka-ui";
import { h, nextTick } from "vue";

import ToggleGroup from "./toggleGroup.vue";
import ToggleGroupItem from "./toggleGroupItem.vue";
import { toggleGroupItemVariants, toggleGroupRootVariants } from "./toggleGroup.variants";

/** Mounts a group of `values` as items, so each test only says what it's about. */
function mountGroup(props: Record<string, unknown> = {}, values = ["list", "grid"]) {
  return mount(ToggleGroup, {
    props,
    slots: {
      default: () => values.map(value => h(ToggleGroupItem, { value, key: value }, () => value)),
    },
  });
}

describe("toggleGroupRootVariants", () => {
  it("defaults to a horizontal recessed trough", () => {
    const result = toggleGroupRootVariants({});

    expect(result).toContain("bg-black/6");
    expect(result).toContain("flex-row");
    expect(result).toContain("p-0.5");
  });

  it("stacks and stretches when vertical", () => {
    const result = toggleGroupRootVariants({ orientation: "vertical" });

    expect(result).toContain("flex-col");
    expect(result).toContain("items-stretch");
  });
});

describe("toggleGroupItemVariants", () => {
  it("raises a white pill only when on", () => {
    const result = toggleGroupItemVariants({});

    expect(result).toContain("data-[state=on]:(bg-white/90 vtext-1)");
    expect(result).toContain("data-[state=off]:(bg-transparent vtext-3 hover:vtext-1)");
  });

  it("sits one step under the control scale, which the root's padding adds back", () => {
    expect(toggleGroupItemVariants({ size: "sm" })).toContain("h-7");
    expect(toggleGroupItemVariants({ size: "md" })).toContain("h-8");
    expect(toggleGroupItemVariants({ size: "lg" })).toContain("h-9");
  });

  it("squares the box and drops the padding when icon-only", () => {
    const result = toggleGroupItemVariants({ square: true, size: "lg" });

    expect(result).toContain("w-9");
    expect(result).not.toContain("px-3.5");
  });
});

describe("dToggleGroup", () => {
  it("renders its items as pressable buttons in a group", () => {
    const wrapper = mountGroup();

    expect(wrapper.attributes("role")).toBe("group");
    expect(wrapper.findAll("button")).toHaveLength(2);
  });

  it("marks the item matching the model as on", () => {
    const wrapper = mountGroup({ type: "single", modelValue: "grid" });
    const [list, grid] = wrapper.findAll("button");

    expect(list?.attributes("data-state")).toBe("off");
    expect(grid?.attributes("data-state")).toBe("on");
  });

  it("swaps the selection on click when single", async () => {
    const wrapper = mountGroup({
      "type": "single",
      "modelValue": "list",
      "onUpdate:modelValue": (value: AcceptableValue | AcceptableValue[]) => wrapper.setProps({ modelValue: value }),
    });

    await wrapper.findAll("button")[1]?.trigger("click");

    expect(wrapper.props("modelValue")).toBe("grid");
  });

  it("accumulates selections when multiple", async () => {
    const wrapper = mountGroup({
      "type": "multiple",
      "modelValue": ["list"],
      "onUpdate:modelValue": (value: AcceptableValue | AcceptableValue[]) => wrapper.setProps({ modelValue: value }),
    });

    await wrapper.findAll("button")[1]?.trigger("click");

    expect(wrapper.props("modelValue")).toEqual(["list", "grid"]);
  });

  // Guards a Vue footgun: `rovingFocus`/`loop` are boolean props, which Vue casts to false
  // when absent — so forwarding them unguarded hands reka `false` and kills arrow keys.
  // reka's roving focus puts the single tab stop on the group and marks the selected item
  // `data-active`, so Tab enters the group once and lands on whatever is currently on.
  it("wires up arrow-key navigation by default", async () => {
    const wrapper = mountGroup({ type: "single", modelValue: "grid" });
    const [list, grid] = wrapper.findAll("button");

    // Items register themselves as focusable on mount; the group's tab stop lands a tick later.
    await nextTick();

    expect(wrapper.attributes("tabindex")).toBe("0");
    expect(wrapper.attributes("data-orientation")).toBe("horizontal");
    expect(list?.attributes("data-active")).toBeUndefined();
    expect(grid?.attributes("data-active")).toBe("");
  });

  it("drops arrow-key navigation when roving focus is off", () => {
    const wrapper = mountGroup({ rovingFocus: false });

    expect(wrapper.attributes("tabindex")).toBeUndefined();
  });

  it("disables every item when the group is disabled", () => {
    const wrapper = mountGroup({ disabled: true });

    expect(wrapper.findAll("button").every(button => button.attributes("disabled") !== undefined)).toBe(true);
  });

  it("hands its size down to the items", () => {
    const wrapper = mountGroup({ size: "lg" });

    expect(wrapper.find("button").classes().join(" ")).toContain("h-9");
  });

  it("lets an item override the group's size", () => {
    const wrapper = mount(ToggleGroup, {
      props: { size: "lg" },
      slots: { default: () => h(ToggleGroupItem, { value: "list", size: "sm" }) },
    });

    expect(wrapper.find("button").classes().join(" ")).toContain("h-7");
  });
});
