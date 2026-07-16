import { defineComponent, h } from "vue";

/** Stands in for the auto-imported lucide icons the form controls render. */
function iconStub(name: string) {
  return defineComponent({
    name,
    setup: () => () => h("svg", { "data-icon": name }),
  });
}

export const iconStubs = {
  IconCalendar: iconStub("IconCalendar"),
  IconCheck: iconStub("IconCheck"),
  IconChevronLeft: iconStub("IconChevronLeft"),
  IconChevronRight: iconStub("IconChevronRight"),
  IconChevronsUpDown: iconStub("IconChevronsUpDown"),
  IconMinus: iconStub("IconMinus"),
  IconPlus: iconStub("IconPlus"),
};
