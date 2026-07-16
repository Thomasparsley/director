import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import Select from "./select.vue";
import type { DSelectItem } from "./select.types";
import { iconStubs } from "../../test/icons";

const items: Array<DSelectItem<string>> = [
  { label: "First", value: "first" },
  { label: "Second", value: "second" },
  { label: "Off limits", value: "off", disabled: true },
];

function mountSelect(props: Record<string, unknown> = {}) {
  return mount(Select, {
    props: { items, ...props },
    // The listbox teleports to <body>; without attaching, its content is unreachable.
    attachTo: document.body,
    global: { components: iconStubs },
  });
}

describe("dSelect", () => {
  it("renders the placeholder until a value is chosen", () => {
    const wrapper = mountSelect({ placeholder: "Pick one" });

    expect(wrapper.find("button").text()).toContain("Pick one");
  });

  it("shows the label of the selected value", () => {
    const wrapper = mountSelect({ modelValue: "second" });

    expect(wrapper.find("button").text()).toContain("Second");
  });

  it("opens the listbox and re-emits update:open", async () => {
    const wrapper = mountSelect();

    // reka opens the select on pointerdown, not click.
    await wrapper.find("button").trigger("pointerdown");

    expect(wrapper.emitted("update:open")).toEqual([[true]]);
    expect(document.body.textContent).toContain("First");
  });

  it("marks the trigger invalid", () => {
    const wrapper = mountSelect({ invalid: true });

    expect(wrapper.find("button").attributes("aria-invalid")).toBe("true");
  });
});
