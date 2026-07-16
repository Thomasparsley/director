import { Time } from "@internationalized/date";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import TimeField from "./timeField.vue";

describe("dTimeField", () => {
  it("renders hour and minute segments for the model value", () => {
    const wrapper = mount(TimeField, {
      props: { modelValue: new Time(14, 30), locale: "en-GB" },
    });

    const text = wrapper.text().replace(/\s+/g, "");
    expect(text).toContain("14");
    expect(text).toContain("30");
  });

  it("renders placeholder segments when empty", () => {
    const wrapper = mount(TimeField, { props: { locale: "en-GB" } });

    expect(wrapper.findAll("[data-placeholder]").length).toBeGreaterThan(0);
  });

  it("marks the frame invalid", () => {
    const wrapper = mount(TimeField, { props: { invalid: true } });

    expect(wrapper.attributes("aria-invalid")).toBe("true");
  });
});
