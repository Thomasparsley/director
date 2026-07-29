import { useAppConfig, useNuxtApp } from "#app";

import { defaultIdentityCookieNames, defaultIdentityTiming } from "../config";
import type { IdentityCookieNames, IdentityTimingConfig } from "../config";
import type { IdentityAppConfig, IdentityPermissionsAdapter } from "../types/appConfig";
import type { IdentityApi, IdentityChallengeApi } from "../types/identityApi";
import { noopIdentityLogger } from "../utils/logger";
import type { IdentityLogger } from "../utils/logger";

export interface IdentityRuntime {
  timing: IdentityTimingConfig
  cookieNames: IdentityCookieNames
  permissions: IdentityPermissionsAdapter | undefined
  /** One logger per scope; the noop logger unless the app configured one. */
  logger: (scope: string) => IdentityLogger
  /** Whether the app configured `identity.api` — the plugin refuses to boot without it. */
  readonly hasApi: boolean
  /** The app's API, built lazily on first use. Throws when unconfigured. */
  readonly api: IdentityApi
  readonly hasChallengeApi: boolean
  /** The app's challenge API, built lazily on first use. Throws when unconfigured. */
  readonly challengeApi: IdentityChallengeApi
}

// Memoised on the (per-request) Nuxt app: the config never changes within an app, and
// the lazily-built API instance must be shared by every composable that talks to it.
const RUNTIME_MEMO_KEY = "$__identityRuntime";

/**
 * Resolves the layer's configuration (`identity` in `app.config`) into the runtime
 * every identity composable reads: merged timing, cookie names, the logger factory
 * and the lazily-constructed app-supplied API.
 */
export function useIdentityRuntime(): IdentityRuntime {
  const nuxtApp = useNuxtApp() as unknown as Record<string, unknown>;
  const existing = nuxtApp[RUNTIME_MEMO_KEY] as IdentityRuntime | undefined;
  if (existing) {
    return existing;
  }

  const input = (useAppConfig() as { identity?: IdentityAppConfig }).identity;
  const logger = input?.logger ?? (() => noopIdentityLogger);

  let api: IdentityApi | undefined;
  let challengeApi: IdentityChallengeApi | undefined;

  const runtime: IdentityRuntime = {
    timing: { ...defaultIdentityTiming, ...input?.timing },
    cookieNames: { ...defaultIdentityCookieNames, ...input?.cookies },
    permissions: input?.permissions,
    logger,

    get hasApi() {
      return input?.api !== undefined;
    },
    get api() {
      const factory = input?.api;
      if (!factory) {
        throw new Error(
          "[identity] No API configured. Set `identity.api` in app.config so the "
          + "identity layer knows how to talk to your backend (see IdentityAppConfig).",
        );
      }
      api ??= factory({ logger: logger("Identity:Api") });
      return api;
    },

    get hasChallengeApi() {
      return input?.challengeApi !== undefined;
    },
    get challengeApi() {
      const factory = input?.challengeApi;
      if (!factory) {
        throw new Error(
          "[identity] No challenge API configured. Set `identity.challengeApi` in "
          + "app.config to use the MFA / step-up challenge flows.",
        );
      }
      challengeApi ??= factory({ logger: logger("Identity:ChallengeApi") });
      return challengeApi;
    },
  };

  nuxtApp[RUNTIME_MEMO_KEY] = runtime;
  return runtime;
}
