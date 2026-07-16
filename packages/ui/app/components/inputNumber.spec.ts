import { mount, type VueWrapper } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import InputNumber from "./inputNumber.vue";
import { iconStubs } from "../../test/icons";

function mountInputNumber(props: Record<string, unknown> = {}) {
  return mount(InputNumber, {
    props,
    global: { components: iconStubs },
  });
}

describe("dInputNumber", () => {
  it("renders the model value in the input", () => {
    const wrapper = mountInputNumber({ modelValue: 42 });

    expect(wrapper.find("input").element.value).toBe("42");
  });

  // reka's steppers react to pointerdown (press-and-hold support), not click, and attach
  // their listener in a post-flush watcher — hence the leading tick. Releasing on window
  // ends the press so no repeat timer leaks into the next test.
  async function press(wrapper: VueWrapper, button: ReturnType<VueWrapper["find"]>) {
    await wrapper.vm.$nextTick();
    await button.trigger("pointerdown");
    window.dispatchEvent(new Event("pointerup"));
  }

  it("increments and decrements via the stepper buttons", async () => {
    const wrapper = mountInputNumber({
      "modelValue": 5,
      "step": 5,
      "onUpdate:modelValue": (value?: number) => wrapper.setProps({ modelValue: value }),
    });

    const [decrement, increment] = wrapper.findAll("button");

    await press(wrapper, increment!);
    expect(wrapper.props("modelValue")).toBe(10);

    await press(wrapper, decrement!);
    expect(wrapper.props("modelValue")).toBe(5);
  });

  it("clamps stepping at the max bound", async () => {
    const wrapper = mountInputNumber({
      "modelValue": 10,
      "max": 10,
      "onUpdate:modelValue": (value?: number) => wrapper.setProps({ modelValue: value }),
    });

    await press(wrapper, wrapper.findAll("button")[1]!);

    expect(wrapper.props("modelValue")).toBe(10);
  });

  it("emits blur from the inner input", async () => {
    const wrapper = mountInputNumber();

    await wrapper.find("input").trigger("blur");

    expect(wrapper.emitted("blur")).toHaveLength(1);
  });
});
