/**
 * The exceptions this layer *throws*.
 *
 * Not to be confused with its sibling in this directory — `identityApiErrors` holds
 * **result codes**: values a function returns to say an operation was refused, on a
 * path where refusal is a normal outcome the caller must handle. Nothing here is a
 * normal outcome. These are the cases where continuing is not possible and the stack
 * should unwind.
 *
 * They were all bare `new Error("some sentence")`. That is fine until something has
 * to tell them apart: a `catch` cannot ask what happened without matching on the
 * message text, and error tracking groups everything the layer throws under one
 * anonymous `Error`. A class per failure fixes both — `instanceof IdentityError`
 * catches the layer, `kind` switches inside it, and each one arrives in tracking
 * under its own name.
 */

import type { RefreshErrorResults } from "./identityApiErrors";

/**
 * The discriminator, so a handler can switch exhaustively rather than chain
 * `instanceof` checks (and so a new member makes that switch fail to compile).
 */
export const IdentityErrorKinds = {
  /** `useIdentity()` was called on an app where the identity plugin never ran. */
  InstanceMissing: "InstanceMissing",
  /** A capability was used that the app never configured in `app.config`. */
  NotConfigured: "NotConfigured",
  /** A token refresh failed in a way that may yet succeed; the retry loop wants it thrown. */
  TokenRefreshFailed: "TokenRefreshFailed",
} as const;

export type IdentityErrorKind = typeof IdentityErrorKinds[keyof typeof IdentityErrorKinds];

/**
 * Base of the hierarchy. Abstract on purpose: "something identity-ish went wrong"
 * is not a thing worth throwing, so every throw site has to say which one.
 *
 * `name` is assigned per subclass rather than read from `new.target.name`, because
 * a production build mangles class names and the whole point of the name is to
 * survive into an error report.
 */
export abstract class IdentityError extends Error {
  abstract readonly kind: IdentityErrorKind;

  protected constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

/**
 * `useIdentity()` found no `$identityInstance`. Always a wiring mistake — the layer
 * extended without `identity.api` configured, the plugin missing from the build, or
 * a composable called outside a Nuxt app (a unit test that forgot its harness).
 * Never a runtime condition to recover from.
 */
export class IdentityInstanceMissingError extends IdentityError {
  readonly kind = IdentityErrorKinds.InstanceMissing;

  constructor() {
    super(
      "Identity instance not found. Configure `identity` in app.config (at minimum "
      + "`identity.api`) so the identity plugin can boot.",
    );
    this.name = "IdentityInstanceMissingError";
  }
}

/**
 * An optional seam was used without being configured — the passkey flows on an app
 * that set no `identity.passkeyApi`, the MFA flows with no `identity.challengeApi`.
 * A wiring mistake like the one above, but one the app can fix from `app.config`, so
 * the message names the key to set.
 */
export class IdentityNotConfiguredError extends IdentityError {
  readonly kind = IdentityErrorKinds.NotConfigured;
  /** The `app.config` key that is missing, e.g. `identity.passkeyApi`. */
  readonly configKey: string;

  constructor(configKey: string, message: string) {
    super(message);
    this.name = "IdentityNotConfiguredError";
    this.configKey = configKey;
  }
}

/**
 * A token refresh failed for a reason that is not a rejection — the network, a 5xx,
 * an unparseable body. Thrown rather than returned because the caller is the refresh
 * loop, whose retry/backoff engages on a throw; a *rejected* refresh is not this, it
 * settles the session `expired` and never reaches here.
 */
export class TokenRefreshFailedError extends IdentityError {
  readonly kind = IdentityErrorKinds.TokenRefreshFailed;
  /** The transport-level code, kept so a handler need not parse the message. */
  readonly result: RefreshErrorResults;

  constructor(result: RefreshErrorResults, options?: ErrorOptions) {
    super(`Failed to refresh access token (error ${result})`, options);
    this.name = "TokenRefreshFailedError";
    this.result = result;
  }
}
