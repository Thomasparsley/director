import { onMounted, readonly, ref, type Ref } from "vue";

// Keys that shouldn't be spelled out: modifiers, whose glyph depends on the platform, and
// the non-printing keys, which have a conventional symbol. Anything not listed here is
// rendered as given, so <DKbd value="K" /> stays "K".
//
// Column 0 is macOS, column 1 everywhere else. `meta` is the platform command key — ⌘ on a
// Mac, Ctrl on Windows and Linux — which is why it and `ctrl` collapse to the same label
// off macOS. Use `meta` for shortcuts that follow the platform, `ctrl` for a literal Ctrl.
const kbdKeyLabels = {
  meta: ["⌘", "Ctrl"],
  command: ["⌘", "⌘"],
  ctrl: ["⌃", "Ctrl"],
  alt: ["⌥", "Alt"],
  option: ["⌥", "⌥"],
  shift: ["⇧", "Shift"],
  capslock: ["⇪", "Caps"],
  enter: ["↵", "Enter"],
  tab: ["⇥", "Tab"],
  escape: ["⎋", "Esc"],
  backspace: ["⌫", "Backspace"],
  delete: ["⌦", "Del"],
  space: ["␣", "Space"],
  arrowup: ["↑", "↑"],
  arrowdown: ["↓", "↓"],
  arrowleft: ["←", "←"],
  arrowright: ["→", "→"],
  pageup: ["⇞", "PgUp"],
  pagedown: ["⇟", "PgDn"],
  home: ["↖", "Home"],
  end: ["↘", "End"],
} as const satisfies Record<string, readonly [string, string]>;

export type DKbdKey = keyof typeof kbdKeyLabels;

/** Turns a key name into what the user sees on their own keyboard. Unknown keys pass through. */
export function resolveKbdKey(value: string | undefined, isMac: boolean): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const labels: readonly [string, string] | undefined
    = kbdKeyLabels[value.toLowerCase() as DKbdKey];

  return labels?.[isMac ? 0 : 1] ?? value;
}

/**
 * Whether we're on a Mac keyboard. False until mounted — `navigator` doesn't exist on the
 * server, and starting at false makes the server and the first client render agree; the
 * flip to ⌘ lands after hydration, which Vue re-renders without a mismatch warning.
 *
 * Per-component rather than a shared module ref: the regex is nothing next to a mount, and
 * keeping the state local means nothing leaks between SSR requests.
 */
export function useIsMac(): Readonly<Ref<boolean>> {
  const isMac = ref(false);

  onMounted(() => {
    isMac.value = /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
  });

  return readonly(isMac);
}
