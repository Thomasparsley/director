import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { nextTick, shallowRef, watch } from "vue";

import type { DialogInstance } from "../types/dialogInstance";

import { useDialogManagerInstance } from "./useDialogManager";

function makeInstance(overrides: Partial<DialogInstance> = {}): DialogInstance {
  return {
    type: "Modal",
    component: { template: "<div />" },
    isOpen: shallowRef(false),
    isCloseable: false,
    withPadding: true,
    ...overrides,
  };
}

describe("useDialogManagerInstance", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("hands back the stored dialog, not the argument, so writes land on the reactive copy", () => {
    const manager = useDialogManagerInstance();
    const [key, registered] = manager.registerDialog(makeInstance());

    expect(manager.getDialog(key)).toBe(registered);

    registered.isOpen = true;

    expect(manager.getDialog(key)?.isOpen).toBe(true);
  });

  test("gives every dialog its own key", () => {
    const manager = useDialogManagerInstance();

    const [first] = manager.registerDialog(makeInstance());
    const [second] = manager.registerDialog(makeInstance());

    expect(first).not.toBe(second);
  });

  // The claim behind the plugin (ADR-0017): a manager per app instance, so two SSR
  // requests in the same process never see each other's dialogs.
  test("each manager owns its registry, so nothing is shared between app instances", () => {
    const first = useDialogManagerInstance();
    const second = useDialogManagerInstance();

    const [key] = first.registerDialog(makeInstance());
    first.addToRender(key);

    expect(first.instances.value).toHaveLength(1);
    expect(second.instances.value).toHaveLength(0);
    expect(second.getDialog(key)).toBeUndefined();
  });

  test("registering does not paint — only addToRender does", () => {
    const manager = useDialogManagerInstance();
    const [key] = manager.registerDialog(makeInstance());

    expect(manager.instances.value).toHaveLength(0);

    manager.addToRender(key);

    expect(manager.instances.value).toMatchObject([{ key }]);
  });

  test("instances is live, so a renderer repaints when a dialog opens", async () => {
    const manager = useDialogManagerInstance();
    const [key] = manager.registerDialog(makeInstance());

    const repaint = vi.fn();
    watch(manager.instances, repaint, { deep: true });

    manager.addToRender(key);
    await nextTick();

    expect(repaint).toHaveBeenCalledTimes(1);
  });

  test("shrugs off keys it has never seen", () => {
    const manager = useDialogManagerInstance();

    expect(manager.getDialog("nope")).toBeUndefined();
    expect(() => manager.addToRender("nope")).not.toThrow();
    expect(() => manager.removeFromRender("nope")).not.toThrow();
    expect(() => manager.unregisterDialog("nope")).not.toThrow();

    vi.advanceTimersByTime(1000);

    expect(manager.instances.value).toHaveLength(0);
  });

  test("keeps a closed dialog mounted until its close transition has played", () => {
    const manager = useDialogManagerInstance();
    const [key] = manager.registerDialog(makeInstance());

    manager.addToRender(key);
    manager.removeFromRender(key);

    expect(manager.instances.value).toHaveLength(1);

    vi.advanceTimersByTime(332);

    expect(manager.instances.value).toHaveLength(1);

    vi.advanceTimersByTime(1);

    expect(manager.instances.value).toHaveLength(0);
  });

  test("honours a caller's own transition length", () => {
    const manager = useDialogManagerInstance();
    const [key] = manager.registerDialog(makeInstance());

    manager.addToRender(key);
    manager.removeFromRender(key, 1000);

    vi.advanceTimersByTime(333);

    expect(manager.instances.value).toHaveLength(1);

    vi.advanceTimersByTime(667);

    expect(manager.instances.value).toHaveLength(0);
  });

  test("a dialog reopened inside the close transition is not unmounted by it", () => {
    const manager = useDialogManagerInstance();
    const [key] = manager.registerDialog(makeInstance());

    manager.addToRender(key);
    manager.removeFromRender(key);

    // Reopened before the queued unmount fires.
    vi.advanceTimersByTime(100);
    manager.addToRender(key);

    vi.advanceTimersByTime(1000);

    expect(manager.instances.value).toMatchObject([{ key }]);
  });

  test("never queues the same dialog to paint twice", () => {
    const manager = useDialogManagerInstance();
    const [key] = manager.registerDialog(makeInstance());

    manager.addToRender(key);
    manager.addToRender(key);

    expect(manager.instances.value).toHaveLength(1);
  });

  test("paints dialogs in the order they were opened", () => {
    const manager = useDialogManagerInstance();
    const [first] = manager.registerDialog(makeInstance());
    const [second] = manager.registerDialog(makeInstance());

    manager.addToRender(second);
    manager.addToRender(first);

    expect(manager.instances.value.map(i => i.key)).toEqual([second, first]);
  });

  test("closing one of several stacked dialogs leaves the rest painted", () => {
    const manager = useDialogManagerInstance();
    const [first] = manager.registerDialog(makeInstance());
    const [second] = manager.registerDialog(makeInstance());
    const [third] = manager.registerDialog(makeInstance());

    manager.addToRender(first);
    manager.addToRender(second);
    manager.addToRender(third);

    manager.removeFromRender(second);
    vi.advanceTimersByTime(333);

    expect(manager.instances.value.map(i => i.key)).toEqual([first, third]);
  });

  test("unregistering unmounts at once — the owner is gone, there is nothing left to animate", () => {
    const manager = useDialogManagerInstance();
    const [key] = manager.registerDialog(makeInstance());

    manager.addToRender(key);
    manager.unregisterDialog(key);

    expect(manager.instances.value).toHaveLength(0);
    expect(manager.getDialog(key)).toBeUndefined();
  });

  // What stops a queued unmount from striking a later dialog: keys are minted from a
  // counter and never recycled, so a stale timer can never match anything again.
  test("never hands out a key twice, even once the dialog holding it is gone", () => {
    const manager = useDialogManagerInstance();
    const [first] = manager.registerDialog(makeInstance());

    manager.unregisterDialog(first);

    const [second] = manager.registerDialog(makeInstance());

    expect(second).not.toBe(first);
  });

  test("unregistering leaves no unmount pending behind it", () => {
    const manager = useDialogManagerInstance();
    const [key] = manager.registerDialog(makeInstance());

    manager.addToRender(key);
    manager.removeFromRender(key);

    expect(vi.getTimerCount()).toBe(1);

    manager.unregisterDialog(key);

    expect(vi.getTimerCount()).toBe(0);
  });
});
