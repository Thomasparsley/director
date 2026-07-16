// reka-ui's floating primitives observe their trigger/content on mount. happy-dom ships no
// ResizeObserver, so without this stub any component that mounts a popper throws.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// reka's SelectTrigger releases pointer capture in its pointerdown handler; happy-dom
// elements don't implement the pointer-capture API, so stub it as a no-op.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.setPointerCapture = () => {};
}
