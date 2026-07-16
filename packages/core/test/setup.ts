// reka-ui's floating primitives (accordion, popover, tooltip) observe their trigger and content
// on mount. happy-dom ships no ResizeObserver, so without this stub every mount throws.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
