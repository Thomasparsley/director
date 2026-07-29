/**
 * Production defaults for the gql layer. Apps override any of them via `app.config`
 * (`gql`), so the values here only describe what an app gets for free.
 */

/** Debounce window for refetching when a query's `variables` ref changes. */
export interface GqlVariablesDebounce {
  /** Wait this long after the last change before refetching. Milliseconds. */
  debounce: number
  /** …but never wait longer than this while changes keep arriving. Milliseconds. */
  maxWait: number
}

export const defaultGqlVariablesDebounce: GqlVariablesDebounce = {
  debounce: 300,
  maxWait: 500,
};

/**
 * Sent with every request. `credentials: "include"` is the default because the common
 * case for a first-party GraphQL API is a cookie session — and unlike a bearer header,
 * a cookie is only attached cross-origin when the request asks for it.
 */
export const defaultGqlFetchOptions: RequestInit = {
  credentials: "include",
};

/**
 * Headers copied from the incoming SSR request onto the server-side client's requests.
 * The server has no cookie jar of its own: without forwarding, an SSR query runs
 * unauthenticated and the first paint disagrees with the client's.
 */
export const defaultGqlSsrForwardHeaders: readonly string[] = ["cookie"];
