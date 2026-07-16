import { CalendarDate } from "@internationalized/date";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import DateField from "./dateField.vue";

describe("dDateField", () => {
  it("renders editable segments for the model value", () => {
    const wrapper = mount(DateField, {
      props: { modelValue: new CalendarDate(2026, 7, 16), locale: "en-US" },
    });

    const text = wrapper.text().replace(/\s+/g, "");
    expect(text).toContain("2026");
    expect(text).toContain("7");
    expect(text).toContain("16");
  });

  it("renders placeholder segments when empty", () => {
    const wrapper = mount(DateField, { props: { locale: "en-US" } });

    expect(wrapper.findAll("[data-placeholder]").length).toBeGreaterThan(0);
  });

  it("adds time segments with minute granularity", () => {
    const wrapper = mount(DateField, {
      props: { granularity: "minute", locale: "en-US" },
    });

    // day + month + year + hour + minute + dayPeriod
    expect(wrapper.findAll("[data-reka-date-field-segment]:not([data-segment=literal])").length).toBeGreaterThanOrEqual(5);
  });

  it("marks the frame invalid", () => {
    const wrapper = mount(DateField, { props: { invalid: true } });

    expect(wrapper.attributes("aria-invalid")).toBe("true");
    expect(wrapper.classes().join(" ")).toContain("ring-error-500/60");
  });
});
