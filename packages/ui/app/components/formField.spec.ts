import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import FormField from "./formField.vue";
import Input from "./input.vue";

describe("dFormField", () => {
  it("links the label to the provided id", () => {
    const wrapper = mount(FormField, {
      props: { id: "email", label: "Email" },
    });

    expect(wrapper.find("label").attributes("for")).toBe("email");
    expect(wrapper.find("label").text()).toBe("Email");
  });

  it("marks a required field with an asterisk", () => {
    const wrapper = mount(FormField, { props: { label: "Name", required: true } });

    expect(wrapper.find("label").text()).toContain("*");
  });

  it("renders hint, description and help", () => {
    const wrapper = mount(FormField, {
      props: { label: "Name", hint: "Optional", description: "Your full name", help: "Shown publicly" },
    });

    expect(wrapper.text()).toContain("Optional");
    expect(wrapper.text()).toContain("Your full name");
    expect(wrapper.text()).toContain("Shown publicly");
  });

  it("shows the error instead of the help text", () => {
    const wrapper = mount(FormField, {
      props: { label: "Name", help: "Shown publicly", error: "Required field" },
    });

    expect(wrapper.find("[role=alert]").text()).toBe("Required field");
    expect(wrapper.text()).not.toContain("Shown publicly");
  });

  it("hands its id and invalid state down to a slotted control", () => {
    const wrapper = mount(FormField, {
      props: { id: "field-id", label: "Name", error: "Required" },
      slots: { default: Input },
    });

    const input = wrapper.find("input");
    expect(input.attributes("id")).toBe("field-id");
    expect(input.attributes("aria-invalid")).toBe("true");
  });

  it("generates an id when none is given, keeping label and control linked", () => {
    const wrapper = mount(FormField, {
      props: { label: "Name" },
      slots: { default: Input },
    });

    const forAttr = wrapper.find("label").attributes("for");
    expect(forAttr).toBeTruthy();
    expect(wrapper.find("input").attributes("id")).toBe(forAttr);
  });
});
