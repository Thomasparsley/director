---
"@directorkit/identity": minor
---

A refused login says which refusal it was, carried over from the app this layer was
extracted from, where "the login failed" turned out to be four different situations
wearing one sentence.

**Four codes where there was one.** `LoginErrorResults` gains `TooManyAttempts`,
`TooManyRequests`, `ServerUnavailable` and `RequestTimedOut`. The timeout mattered most:
`AbortSignal.timeout` rejects exactly the way a refused connection does, so a request
that went out and was not answered became `FailedToSendLoginRequest` — sending a user
whose network is fine to go and look at their network. A 5xx and a 429 were both
`FailedToLogin`, though the right next move differs: come back later, or wait a minute.

**A rate limit says which limit and how long.** The failed arm of every login-family
result is now a `LoginFailure` — the plain `{ success: false, error }` pair widened with
optional detail — so `result.error` is still the code every existing call site compares,
and `result.retryAfterSeconds` sits beside it when the server named a number. The layer
reads it from a JSON 429 body (`{ scope, retryAfterSeconds }`, the shipped contract's
shape) and falls back to a standard `Retry-After` header, seconds or HTTP-date, for a
backend that only sets that. `scope` separates a login limiter from one counting every
request from the address: the second can refuse a *first* attempt, so "too many login
attempts" would be the wrong sentence. An unreadable 429 — a proxy, a CDN, an older
backend — keeps the endpoint's own meaning rather than guessing.

**The challenge legs stop blaming the challenge.** Backends commonly put `/challenge/*`
on the login endpoint's rate-limit partition, where an MFA login spends two permits per
attempt, so a rate-limited code submission fell through to `ChallengeExpired`: the user
restarted from the password form, spent two more permits, and was refused again. A 429
is now `TooManyAttempts`, a 5xx is `ServerUnavailable`, and a timeout is told apart from
a connection that never opened. `InvalidMfaCode` also carries the `remainingAttempts`
the response has always contained and the mapping used to throw away, so a dialog can
count down instead of letting someone find the limit by hitting it.

**A rate-limited passkey login no longer reads as a broken passkey.** Both passkey legs
sit behind the same partition, and every non-2xx collapsed into `Rejected` — which is
how a person who believes their passkey is broken deletes a perfectly good one.
`PasskeyErrorResults` gains `RateLimited`, `GloballyRateLimited` and `ServerUnavailable`,
and a passkey failure carries `retryAfterSeconds` too.

Nothing that reads `result.error` has to change. What is new is the field beside it, and
`fetchUser` in `IdentityApi` now returns a `LoginResult<IdentityUser>` — structurally the
same `Result` it always returned, with room for the detail an app's own `me` call can now
pass on.
