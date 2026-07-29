/**
 * Stands in for `#app` under bare Vitest, which has no Nuxt app. It re-supplies only what
 * the gql layer touches: a per-test fake Nuxt app object (the runtime resolver memoises
 * itself on it, and the plugin's provides are read off it), the SSR payload bag, an
 * app-config stub and the request-header reader.
 *
 * It also owns which side of the render the code under test believes it is on — see
 * {@link setRenderSide}. `import.meta.server` / `import.meta.client` are compile-time
 * replacements, so `vitest.config.ts` maps them onto the globals set here; that is the
 * only way a single suite can exercise both the SSR and the hydration path.
 */

interface FakeNuxtApp extends Record<string, unknown> {
  payload: { data: Record<string, unknown> }
  isHydrating: boolean
}

let app: FakeNuxtApp = makeApp();
let appConfig: Record<string, unknown> = {};
let requestHeaders: Record<string, string> = {};

function makeApp(): FakeNuxtApp {
  return {
    payload: { data: {} },
    isHydrating: false,
  };
}

/** Reset the fake Nuxt app between tests; pass the app config the test wants to see. */
export function resetNuxtAppStub(config: Record<string, unknown> = {}): void {
  app = makeApp();
  appConfig = config;
  requestHeaders = {};
  setRenderSide("client");
}

/** Hand the code under test its `$`-provided values, as the real plugin would. */
export function provideToNuxtApp(values: Record<string, unknown>): void {
  Object.assign(app, values);
}

/** What the incoming SSR request's headers look like. */
export function setRequestHeaders(headers: Record<string, string>): void {
  requestHeaders = headers;
}

/** Flip `import.meta.server` / `import.meta.client` for the code under test. */
export function setRenderSide(side: "server" | "client"): void {
  (globalThis as Record<string, unknown>).__NUXT_SERVER__ = side === "server";
  (globalThis as Record<string, unknown>).__NUXT_CLIENT__ = side === "client";
}

/** Pretend the client is replaying the server's payload. */
export function setHydrating(isHydrating: boolean): void {
  app.isHydrating = isHydrating;
}

/** Read what a test's code wrote into the SSR payload. */
export function nuxtPayloadData(): Record<string, unknown> {
  return app.payload.data;
}

export function useNuxtApp(): FakeNuxtApp {
  return app;
}

export function useAppConfig(): Record<string, unknown> {
  return appConfig;
}

export function useRequestHeaders(include?: string[]): Record<string, string> {
  if (!include) {
    return { ...requestHeaders };
  }
  const picked: Record<string, string> = {};
  for (const name of include) {
    const value = requestHeaders[name];
    if (value !== undefined) {
      picked[name] = value;
    }
  }
  return picked;
}

export function defineNuxtPlugin<T>(plugin: T): T {
  return plugin;
}
