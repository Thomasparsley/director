import type { Ref } from "vue";
import { ref } from "vue";

/**
 * Stands in for `#app` under bare Vitest, which has no Nuxt app. It re-supplies only
 * what the identity layer touches: a per-test fake Nuxt app object (the store memoises
 * its shared cookie refs on it, the runtime resolver memoises itself on it), keyed
 * `useState`, cookie refs seeded from `cookieSeeds`, and an app-config stub.
 *
 * Each `useCookie()` call returns an INDEPENDENT ref seeded from `cookieSeeds` — this
 * mirrors real Nuxt, where two `useCookie` refs for the same name do not sync. The
 * store must therefore share a single ref per cookie internally (bug B4 upstream).
 */
let app: Record<string, unknown> = {};
let states = new Map<string, Ref<unknown>>();
let appConfig: Record<string, unknown> = {};

export const cookieSeeds: Record<string, string | boolean | undefined> = {};
export const cookieCalls = { count: 0 };

/** Reset the fake Nuxt app between tests; pass the app config the test wants to see. */
export function resetNuxtAppStub(config: Record<string, unknown> = {}): void {
  app = {};
  states = new Map();
  appConfig = config;
  for (const key of Object.keys(cookieSeeds)) {
    delete cookieSeeds[key];
  }
  cookieCalls.count = 0;
}

export function useNuxtApp(): Record<string, unknown> {
  return app;
}

export function useAppConfig(): Record<string, unknown> {
  return appConfig;
}

export function useState<T>(key: string, init?: () => T): Ref<T> {
  const existing = states.get(key);
  if (existing) {
    return existing as Ref<T>;
  }
  const created = ref(init ? init() : undefined) as Ref<unknown>;
  states.set(key, created);
  return created as Ref<T>;
}

export function useCookie<T>(name: string, _opts?: unknown): Ref<T | undefined> {
  cookieCalls.count++;
  return ref(cookieSeeds[name]) as Ref<T | undefined>;
}

export function refreshCookie(_name: string): void {}

export function useRequestEvent(): undefined {
  return undefined;
}

export function defineNuxtPlugin<T>(plugin: T): T {
  return plugin;
}
