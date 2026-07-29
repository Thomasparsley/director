/** Minimal structured logger shape shared by the identity pieces. */
export interface IdentityLogger {
  log: (message: unknown, ...rest: unknown[]) => void
  debug: (message: unknown, ...rest: unknown[]) => void
  warn: (message: unknown, ...rest: unknown[]) => void
  error: (message: unknown, ...rest: unknown[]) => void
}

/** The default: identity is silent unless the app plugs a logger into `app.config`. */
export const noopIdentityLogger: IdentityLogger = {
  log: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
};
