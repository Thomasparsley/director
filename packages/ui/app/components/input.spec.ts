import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import Input from "./input.vue";
import { controlVariants } from "./control.variants";

describe("controlVariants", () => {
  it("applies the md size by default", () => {
    expect(controlVariants({})).toContain("h-9");
  });

  it("swaps the hairline ring for the error ring when invalid", () => {
    expect(controlVariants({ invalid: true })).toContain("ring-error-500/60");
    expect(controlVariants({ invalid: false })).not.toContain("ring-error-500/60");
  });

  it.each([
    ["sm", "h-8"],
    ["md", "h-9"],
    ["lg", "h-10"],
  ] as const)("maps size %s onto its control height", (size, expected) => {
    expect(controlVariants({ size })).toContain(expected);
  });
});

describe("dInput", () => {
  it("binds v-model to the native input", async () => {
    const wrapper = mount(Input, {
      props: {
        "modelValue": "",
        "onUpdate:modelValue": (value?: string | number) => wrapper.setProps({ modelValue: value }),
      },
    });

    await wrapper.find("input").setValue("hello");

    expect(wrapper.props("modelValue")).toBe("hello");
  });

  it("emits blur and enter", async () => {
    const wrapper = mount(Input);

    await wrapper.find("input").trigger("blur");
    await wrapper.find("input").trigger("keydown.enter");

    expect(wrapper.emitted("blur")).toHaveLength(1);
    expect(wrapper.emitted("enter")).toHaveLength(1);
  });

  it("pads the input when a leading icon is slotted", () => {
    const withIcon = mount(Input, { slots: { leading: "<svg />" } });
    const without = mount(Input);

    expect(withIcon.find("input").classes()).toContain("pl-8");
    expect(without.find("input").classes()).not.toContain("pl-8");
  });

  it("marks the input invalid via prop", () => {
    const wrapper = mount(Input, { props: { invalid: true } });

    expect(wrapper.find("input").attributes("aria-invalid")).toBe("true");
    expect(wrapper.find("input").classes().join(" ")).toContain("ring-error-500/60");
  });

  it("passes through native attributes", () => {
    const wrapper = mount(Input, {
      props: { type: "email", placeholder: "you@example.com", maxLength: 10, disabled: true },
    });

    const input = wrapper.find("input");
    expect(input.attributes("type")).toBe("email");
    expect(input.attributes("placeholder")).toBe("you@example.com");
    expect(input.attributes("maxlength")).toBe("10");
    expect(input.attributes("disabled")).toBeDefined();
  });
});
