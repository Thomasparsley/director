/**
 * Parse a JS-readable boolean marker cookie (e.g. `has_acc_tkn`). It only ever holds
 * "true"/"false", so we compare directly: a malformed or tampered value yields `false`
 * instead of throwing (an unguarded JSON.parse would crash the identity plugin with an
 * SSR 500).
 */
export function parseBooleanCookie(value: unknown): boolean {
  // `useCookie` decodes the raw "true"/"false" string with `destr`, so on the
  // client the value arrives as a real boolean, while a raw server-side cookie
  // read hands back the string. Accept both so `hasAccessToken` is correct
  // in both places — otherwise the token lifecycle never sees the cookie and
  // silent auto-refresh stops working on the client.
  return value === true || value === "true";
}
