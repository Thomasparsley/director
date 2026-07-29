/** Minimal structured logger shape shared by the gql pieces. */
export interface GqlLogger {
  log: (message: unknown, ...rest: unknown[]) => void
  debug: (message: unknown, ...rest: unknown[]) => void
  warn: (message: unknown, ...rest: unknown[]) => void
  error: (message: unknown, ...rest: unknown[]) => void
}

/** The default: the layer is silent unless the app plugs a logger into `app.config`. */
export const noopGqlLogger: GqlLogger = {
  log: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
};
