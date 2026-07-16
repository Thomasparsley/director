import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import { useFormControl } from "#layers/director-forms/app/composables/useFormControl";
import { stringTrimTransformer } from "#layers/director-forms/app/transformers";
import { requiredValidator } from "#layers/director-forms/app/validators";

import FormInputSfc from "./input.vue";

// mount() cannot infer the SFC's generic parameter, so pin it to string here.
const FormInput = FormInputSfc as typeof FormInputSfc<string>;

describe("dFormInput", () => {
  it("renders the field label and the control's value", () => {
    const control = useFormControl("Jane");
    const wrapper = mount(FormInput, { props: { control, label: "Name" } });

    expect(wrapper.find("label").text()).toBe("Name");
    expect(wrapper.find("input").element.value).toBe("Jane");
  });

  it("writes typed input back into the control", async () => {
    const control = useFormControl("");
    const wrapper = mount(FormInput, { props: { control } });

    await wrapper.find("input").setValue("hello");

    expect(control.data.value).toBe("hello");
    expect(control.isDirty.value).toBe(true);
  });

  it("transforms and validates on blur, then shows the error", async () => {
    const control = useFormControl("   ", {
      validators: [requiredValidator()],
      lazyTransformers: [stringTrimTransformer],
    });
    const wrapper = mount(FormInput, { props: { control, label: "Name" } });

    await wrapper.find("input").trigger("blur");
    await wrapper.vm.$nextTick();

    expect(control.data.value).toBe("");
    expect(control.hasError.value).toBe(true);
    expect(wrapper.find("[role=alert]").exists()).toBe(true);
  });

  it("links the label to the input through the generated field id", () => {
    const control = useFormControl("");
    const wrapper = mount(FormInput, { props: { control, label: "Name" } });

    expect(wrapper.find("input").attributes("id")).toBe(wrapper.find("label").attributes("for"));
  });
});
