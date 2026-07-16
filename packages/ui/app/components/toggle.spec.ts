import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import Toggle from "./toggle.vue";
import { toggleVariants } from "./toggle.variants";

describe("toggleVariants", () => {
  it("defaults to raised glass at the medium size", () => {
    const result = toggleVariants({});

    expect(result).toContain("data-[state=off]:(bg-white/60 vtext-1 ring-black/10 hover:bg-white/80)");
    expect(result).toContain("h-9");
    expect(result).toContain("px-3");
  });

  it("fills with tinted glass when on", () => {
    expect(toggleVariants({})).toContain("data-[state=on]:(bg-primary-500/90 text-white ring-primary-400/50 hover:bg-primary-500)");
  });

  it("drops the raised fill for the ghost variant", () => {
    const result = toggleVariants({ variant: "ghost" });

    expect(result).toContain("data-[state=off]:(bg-transparent vtext-3 hover:bg-black/6 hover:vtext-1)");
    expect(result).not.toContain("bg-white/60");
  });

  it("squares the box and drops the padding when icon-only", () => {
    const result = toggleVariants({ square: true, size: "sm" });

    expect(result).toContain("h-8");
    expect(result).toContain("w-8");
    expect(result).not.toContain("px-2.5");
  });
});

describe("dToggle", () => {
  it("renders a real pressable button", () => {
    const button = mount(Toggle).find("button");

    expect(button.exists()).toBe(true);
    expect(button.attributes("aria-pressed")).toBe("false");
    expect(button.attributes("data-state")).toBe("off");
  });

  it("toggles the model on click", async () => {
    const wrapper = mount(Toggle, {
      props: {
        "modelValue": false,
        "onUpdate:modelValue": (value: boolean) => wrapper.setProps({ modelValue: value }),
      },
    });

    await wrapper.find("button").trigger("click");

    expect(wrapper.props("modelValue")).toBe(true);
    expect(wrapper.find("button").attributes("aria-pressed")).toBe("true");
  });

  it("does not toggle when disabled", async () => {
    const wrapper = mount(Toggle, {
      props: {
        "modelValue": false,
        "disabled": true,
        "onUpdate:modelValue": (value: boolean) => wrapper.setProps({ modelValue: value }),
      },
    });

    await wrapper.find("button").trigger("click");

    expect(wrapper.props("modelValue")).toBe(false);
  });

  it("names an icon-only toggle for screen readers", () => {
    const wrapper = mount(Toggle, { props: { label: "Bold", square: true } });

    expect(wrapper.find("button").attributes("aria-label")).toBe("Bold");
  });

  it("exposes the pressed state to the slot", () => {
    const wrapper = mount(Toggle, {
      props: { modelValue: true },
      slots: { default: ({ pressed }: { pressed: boolean }) => (pressed ? "On" : "Off") },
    });

    expect(wrapper.text()).toBe("On");
  });
});
