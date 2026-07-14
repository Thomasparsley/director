import type { Component, DefineComponent } from "vue";

import type { LazyFn } from "./lazy";

type RawComponent = Component | DefineComponent;
export type ComponentLoader = RawComponent | LazyFn<RawComponent>;
