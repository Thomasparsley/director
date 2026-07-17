import type { Component, DefineComponent } from "vue";

import type { LazyFn } from "./lazy";

type RawComponent = Component | DefineComponent;
export type ComponentLoader = RawComponent | LazyFn<RawComponent>;

/**
 * Turns an emits declaration into the listener object that satisfies it — the shape
 * `v-on` takes. `{ close: [], saved: [id: string] }` becomes
 * `{ close: () => void, saved: (id: string) => void }`.
 *
 * Needed wherever a component is bound programmatically rather than in a template,
 * so the listeners are still checked against what the component actually emits.
 */
export type EmitsToEvents<T> = {
  [K in keyof T]: T[K] extends [...infer Args] ? (...args: Args) => void : () => void;
};
