import { CalendarDate } from "@internationalized/date";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import DatePicker from "./datePicker.vue";
import { iconStubs } from "../../test/icons";

function mountDatePicker(props: Record<string, unknown> = {}) {
  return mount(DatePicker, {
    props: { locale: "en-US", ...props },
    // The calendar teleports to <body>; without attaching, its content is unreachable.
    attachTo: document.body,
    global: { components: iconStubs },
  });
}

describe("dDatePicker", () => {
  it("renders the segmented field with the model value", () => {
    const wrapper = mountDatePicker({ modelValue: new CalendarDate(2026, 7, 16) });

    const text = wrapper.text().replace(/\s+/g, "");
    expect(text).toContain("2026");
    expect(text).toContain("16");
  });

  it("opens the calendar from the trigger and re-emits update:open", async () => {
    const wrapper = mountDatePicker({ modelValue: new CalendarDate(2026, 7, 16) });

    await wrapper.find("button").trigger("click");

    expect(wrapper.emitted("update:open")).toEqual([[true]]);
    expect(document.body.textContent).toContain("July 2026");
  });
});
