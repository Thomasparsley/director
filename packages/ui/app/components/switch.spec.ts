import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import Switch from "./switch.vue";

describe("dSwitch", () => {
  it("renders a real switch button with its label", () => {
    const wrapper = mount(Switch, { props: { label: "Notifications" } });

    const button = wrapper.find("button[role=switch]");
    expect(button.exists()).toBe(true);
    expect(wrapper.text()).toContain("Notifications");
  });

  it("toggles the model on click", async () => {
    const wrapper = mount(Switch, {
      props: {
        "modelValue": false,
        "onUpdate:modelValue": (value: boolean) => wrapper.setProps({ modelValue: value }),
      },
    });

    await wrapper.find("button[role=switch]").trigger("click");

    expect(wrapper.props("modelValue")).toBe(true);
    expect(wrapper.find("button[role=switch]").attributes("aria-checked")).toBe("true");
  });

  it("does not toggle when disabled", async () => {
    const wrapper = mount(Switch, {
      props: {
        "modelValue": false,
        "disabled": true,
        "onUpdate:modelValue": (value: boolean) => wrapper.setProps({ modelValue: value }),
      },
    });

    await wrapper.find("button[role=switch]").trigger("click");

    expect(wrapper.props("modelValue")).toBe(false);
  });
});
