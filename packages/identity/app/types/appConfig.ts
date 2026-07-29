import type { IdentityTimingConfig } from "../config";
import type { IdentityLogger } from "../utils/logger";
import type { IdentityApi, IdentityChallengeApi } from "./identityApi";
import type { IdentityPermission } from "./permissions";
import type { IdentityUser } from "./user";

/** Context handed to the `api`/`challengeApi` factories when the layer builds them. */
export interface IdentityApiFactoryContext {
  logger: IdentityLogger
}

/**
 * Teaches the layer how to read permissions off the app's user shape. Both hooks are
 * optional: without them every permission check simply answers `false` (except the
 * scope-chain path, which carries its own permission lists).
 */
export interface IdentityPermissionsAdapter {
  /** A user with full access short-circuits every permission check to `true`. */
  hasFullAccess?: (user: IdentityUser) => boolean
  /** The flat permission list granted to the user (e.g. from their role). */
  permissionsOf?: (user: IdentityUser) => readonly IdentityPermission[] | undefined
}

/**
 * The layer's whole configuration surface, set from the consuming app. Type the
 * entry with `satisfies` — a layer cannot reliably augment `nuxt/schema` for a
 * program that compiles its raw source (the ADR-0001 trade):
 *
 * ```ts
 * // app/app.config.ts
 * export default defineAppConfig({
 *   identity: {
 *     api: () => ({
 *       ...makeIdentityApiClient(useRuntimeConfig().public.identityApi),
 *       fetchUser: () => myFetchUser(),
 *     }),
 *   } satisfies IdentityAppConfig,
 * });
 * ```
 *
 * Only `api` is required for the plugin to boot; everything else has defaults.
 */
export interface IdentityAppConfig {
  /**
   * Builds the app's {@link IdentityApi}. Called lazily, once per app, inside Nuxt
   * context — so it may use `useRuntimeConfig()` and friends.
   */
  api?: (context: IdentityApiFactoryContext) => IdentityApi

  /** Builds the optional {@link IdentityChallengeApi} for MFA / step-up flows. */
  challengeApi?: (context: IdentityApiFactoryContext) => IdentityChallengeApi

  /** Timing overrides, merged over `defaultIdentityTiming`. */
  timing?: Partial<IdentityTimingConfig>

  /** Marker-cookie name overrides, merged over `defaultIdentityCookieNames`. */
  cookies?: {
    hasAccessToken?: string
    hasRefreshToken?: string
  }

  /** How to read permissions off the app's user shape. */
  permissions?: IdentityPermissionsAdapter

  /** Logger factory (one logger per scope); identity is silent without it. */
  logger?: (scope: string) => IdentityLogger
}
