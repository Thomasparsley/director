import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { computed, defineComponent, h, ref } from "vue";

import type { EmitsToEvents } from "#layers/director-common/app/types/components";

import { setTestDialogManager } from "../../test/nuxtApp";

import { useModalDialog, useSheetDialog } from "./useDialog";
import { type DialogManager, useDialogManagerInstance } from "./useDialogManager";

const DialogComponent = defineComponent({ template: "<div />" });
const OtherDialogComponent = defineComponent({ template: "<span />" });

/**
 * The composables register an onUnmounted hook and reach for the app-wide manager, so
 * each spec runs one inside a throwaway host component and drives the live API it hands
 * back. The host sits behind a v-if so `unmountHost` retires it the way navigating away
 * from a page retires the component that opened the dialog.
 */
function setupDialog<T>(useDialogFn: () => T) {
  let api!: T;

  const Host = defineComponent({
    setup() {
      api = useDialogFn();
      return () => h("div");
    },
  });

  const wrapper = mount(defineComponent({
    data: () => ({ shown: true }),
    render() {
      return this.shown ? h(Host) : null;
    },
  }));

  return {
    get api() {
      return api;
    },
    async unmountHost() {
      await wrapper.setData({ shown: false });
    },
  };
}

describe("useModalDialog / useSheetDialog", () => {
  let manager: DialogManager;

  /** The dialog the renderer would currently be painting. */
  function painted() {
    return manager.instances.value;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    manager = useDialogManagerInstance();
    setTestDialogManager(manager);
  });

  afterEach(() => {
    setTestDialogManager(undefined);
    vi.useRealTimers();
  });

  describe("what it hands the renderer", () => {
    test("registers closed, and does not paint until opened", () => {
      const { api } = setupDialog(() => useModalDialog(DialogComponent, {}));

      expect(api.isOpen.value).toBe(false);
      expect(painted()).toHaveLength(0);

      api.openDialog();

      expect(api.isOpen.value).toBe(true);
      expect(painted()).toHaveLength(1);
    });

    // Without markRaw the manager's `ref` would deep-proxy the component definition, so
    // this asserts identity rather than shape: a proxy would not be the same object.
    test("keeps the component raw rather than making it a reactive proxy", () => {
      const { api } = setupDialog(() => useModalDialog(DialogComponent, {}));

      api.openDialog();

      expect(painted()[0]?.instance.component).toBe(DialogComponent);
    });

    // The manager holds the instance in a `ref`, which deep-unwraps the props computed —
    // so a renderer binds `instance.props` directly and never reaches for `.value`.
    test("hands the renderer live, already-unwrapped props", () => {
      const title = ref("first");
      const { api } = setupDialog(() => useModalDialog<{ title: string }>(DialogComponent, {
        props: computed(() => ({ title: title.value })),
      }));

      api.openDialog();

      expect(painted()[0]?.instance.props).toEqual({ title: "first" });

      title.value = "second";

      expect(painted()[0]?.instance.props).toEqual({ title: "second" });
    });

    test("hands the renderer the listeners it will v-on, wired to the caller's handlers", () => {
      const confirm = vi.fn();
      const { api } = setupDialog(() => useModalDialog<undefined, { confirm: [id: string] }>(DialogComponent, {
        emits: { confirm: id => confirm(id) },
      }));

      api.openDialog();

      // What `v-on="dialog.instance.emits"` ends up calling when the dialog emits.
      const emits = painted()[0]?.instance.emits as EmitsToEvents<{ confirm: [id: string] }>;
      emits.confirm("team-1");

      expect(confirm).toHaveBeenCalledWith("team-1");
    });

    test("pads by default and is not closeable by default", () => {
      const { api } = setupDialog(() => useModalDialog(DialogComponent, {}));

      api.openDialog();

      expect(painted()[0]?.instance).toMatchObject({ withPadding: true, isCloseable: false });
    });

    test("passes the caller's own padding and closeability through", () => {
      const { api } = setupDialog(() => useModalDialog(DialogComponent, {
        isCloseable: true,
        withPadding: false,
      }));

      api.openDialog();

      expect(painted()[0]?.instance).toMatchObject({ withPadding: false, isCloseable: true });
    });

    test("a modal carries no direction; a sheet slides in from the right unless told otherwise", () => {
      const { api: modal } = setupDialog(() => useModalDialog(DialogComponent, {}));
      const { api: right } = setupDialog(() => useSheetDialog(DialogComponent, {}));
      const { api: left } = setupDialog(() => useSheetDialog(DialogComponent, { direction: "left" }));
      const { api: top } = setupDialog(() => useSheetDialog(DialogComponent, { direction: "top" }));
      const { api: bottom } = setupDialog(() => useSheetDialog(DialogComponent, { direction: "bottom" }));

      [modal, right, left, top, bottom].forEach(d => d.openDialog());

      expect(painted().map(i => [i.instance.type, i.instance.direction])).toEqual([
        ["Modal", undefined],
        ["Sheet", "right"],
        ["Sheet", "left"],
        ["Sheet", "top"],
        ["Sheet", "bottom"],
      ]);
    });
  });

  describe("closing", () => {
    test("flips the dialog shut at once and unmounts it after the transition", () => {
      const { api } = setupDialog(() => useModalDialog(DialogComponent, {}));

      api.openDialog();
      api.closeDialog();

      expect(api.isOpen.value).toBe(false);
      expect(painted()).toHaveLength(1);

      vi.advanceTimersByTime(333);

      expect(painted()).toHaveLength(0);
    });

    test("calls the config's onClose on every close, not just the first", () => {
      const onClose = vi.fn();
      const { api } = setupDialog(() => useModalDialog(DialogComponent, { onClose }));

      api.openDialog();
      api.closeDialog();

      expect(onClose).toHaveBeenCalledTimes(1);

      api.openDialog();
      api.closeDialog();

      expect(onClose).toHaveBeenCalledTimes(2);
    });

    test("runs the config's onClose before any onCloseEvent listener", () => {
      const calls: string[] = [];
      const { api } = setupDialog(() => useModalDialog(DialogComponent, {
        onClose: () => calls.push("config"),
      }));

      api.onCloseEvent.on(() => calls.push("listener"));

      api.openDialog();
      api.closeDialog();

      expect(calls).toEqual(["config", "listener"]);
    });

    // A sharp edge worth naming: closeDialog does not check whether the dialog was ever
    // open, so it is not usable as a "close if open" guard.
    test("fires onClose even for a dialog that was never opened", () => {
      const onClose = vi.fn();
      const { api } = setupDialog(() => useModalDialog(DialogComponent, { onClose }));

      api.closeDialog();

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(painted()).toHaveLength(0);
    });

    /**
     * Pins a known gap rather than desired behaviour. The renderer this was ported from
     * wires `@update:open` straight to `manager.removeFromRender(key)`, so a close by
     * escape or overlay click never reaches `closeDialog` and no onClose runs — the
     * dialog just vanishes. Whatever renderer this layer grows must route closes through
     * `closeDialog`, or onClose only ever covers programmatic closes (ADR-0017). Change
     * this test when that is settled.
     */
    test("a close driven the way a renderer drives it never reaches onClose", () => {
      const onClose = vi.fn();
      const { api } = setupDialog(() => useModalDialog(DialogComponent, {
        isCloseable: true,
        onClose,
      }));

      api.openDialog();

      const dialog = painted()[0]!;
      dialog.instance.isOpen = false;
      manager.removeFromRender(dialog.key);
      vi.advanceTimersByTime(333);

      expect(api.isOpen.value).toBe(false);
      expect(painted()).toHaveLength(0);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("the lifetime of the component that opened it", () => {
    test("unregisters when the component that opened it unmounts", async () => {
      const { api, unmountHost } = setupDialog(() => useModalDialog(DialogComponent, {}));

      api.openDialog();
      await unmountHost();

      expect(painted()).toHaveLength(0);
    });

    // The success dialog opened as the page navigates away: it must outlive its opener
    // and still be driveable from whatever controller owns it.
    test("a dialog told to outlive its opener stays open, and still closes afterwards", async () => {
      const { api, unmountHost } = setupDialog(() => useModalDialog(DialogComponent, {
        unregisterOnUnmount: false,
      }));

      api.openDialog();
      await unmountHost();

      expect(painted()).toHaveLength(1);
      expect(api.isOpen.value).toBe(true);

      api.closeDialog();
      vi.advanceTimersByTime(333);

      expect(api.isOpen.value).toBe(false);
      expect(painted()).toHaveLength(0);
    });
  });

  describe("the shapes real callers build out of it", () => {
    // An editor dialog whose opener keeps the subject being edited in a ref and clears it
    // on close, so the next open starts clean. This is what the onClose fix buys.
    test("onClose lets the opener reset its state, so reopening starts fresh", () => {
      const subject = ref<string | undefined>(undefined);

      const { api } = setupDialog(() => useModalDialog<{ subject: string | undefined }>(DialogComponent, {
        props: computed(() => ({ subject: subject.value })),
        onClose: () => {
          subject.value = undefined;
        },
      }));

      subject.value = "team-1";
      api.openDialog();

      expect(painted()[0]?.instance.props).toEqual({ subject: "team-1" });

      api.closeDialog();

      expect(subject.value).toBeUndefined();
      expect(painted()[0]?.instance.props).toEqual({ subject: undefined });
    });

    // A form dialog that emits a "collisions" result: the handler closes it and opens a
    // second dialog in the same tick, while the first is still transitioning out.
    test("one dialog can hand over to another mid-transition without taking it down", () => {
      const { api } = setupDialog(() => ({
        form: useModalDialog(DialogComponent, {}),
        collisions: useModalDialog(OtherDialogComponent, {}),
      }));

      api.form.openDialog();
      api.form.closeDialog();
      api.collisions.openDialog();

      // Both painted: the form is still playing its close transition.
      expect(painted()).toHaveLength(2);

      vi.advanceTimersByTime(333);

      expect(painted()).toHaveLength(1);
      expect(painted()[0]?.instance.component).toBe(OtherDialogComponent);
      expect(api.collisions.isOpen.value).toBe(true);
    });

    // A keep-alive ("are you still there?") modal: not closeable by hand, opened and
    // closed only by its controller, and registered for the life of the app.
    test("a controller-driven dialog reopens cleanly across many cycles", () => {
      const confirm = vi.fn();
      const { api } = setupDialog(() => useModalDialog<undefined, { confirm: [] }>(DialogComponent, {
        emits: { confirm: () => confirm() },
        isCloseable: false,
        unregisterOnUnmount: false,
      }));

      for (let i = 0; i < 3; i++) {
        api.openDialog();

        expect(painted()).toHaveLength(1);

        const emits = painted()[0]?.instance.emits as EmitsToEvents<{ confirm: [] }>;
        emits.confirm();

        api.closeDialog();
        vi.advanceTimersByTime(333);

        expect(painted()).toHaveLength(0);
      }

      expect(confirm).toHaveBeenCalledTimes(3);
    });
  });
});
