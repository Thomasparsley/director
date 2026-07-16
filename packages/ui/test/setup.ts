// reka-ui's floating primitives observe their trigger/content on mount. happy-dom ships no
// ResizeObserver, so without this stub any component that mounts a popper throws.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
