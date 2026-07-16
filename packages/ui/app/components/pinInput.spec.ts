import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import PinInput from "./pinInput.vue";

// The root also renders a visually hidden input for form submission (aria-hidden);
// the visible cells are the rest.
const cellSelector = "input:not([aria-hidden])";

describe("dPinInput", () => {
  it("renders one cell per length", () => {
    const wrapper = mount(PinInput, { props: { length: 6 } });

    expect(wrapper.findAll(cellSelector)).toHaveLength(6);
  });

  it("defaults to five cells", () => {
    expect(mount(PinInput).findAll(cellSelector)).toHaveLength(5);
  });

  it("shows a prefilled model in the cells", () => {
    const wrapper = mount(PinInput, { props: { modelValue: ["1", "2", "3"] } });

    const values = wrapper.findAll(cellSelector).map(input => (input.element as HTMLInputElement).value);
    expect(values.slice(0, 3)).toEqual(["1", "2", "3"]);
  });

  it("emits complete once every cell is filled", async () => {
    const wrapper = mount(PinInput, {
      props: {
        "length": 3,
        "modelValue": [],
        "onUpdate:modelValue": (value: Array<string>) => wrapper.setProps({ modelValue: value }),
      },
      attachTo: document.body,
    });

    const inputs = wrapper.findAll(cellSelector);
    for (const [index, input] of inputs.entries()) {
      await input.setValue(String(index + 1));
    }

    expect(wrapper.emitted("complete")?.at(-1)).toEqual([["1", "2", "3"]]);
  });

  it("marks the cells invalid", () => {
    const wrapper = mount(PinInput, { props: { invalid: true } });

    expect(wrapper.find(cellSelector).attributes("aria-invalid")).toBe("true");
  });
});
