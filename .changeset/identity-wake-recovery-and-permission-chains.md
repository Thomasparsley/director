---
"@directorkit/identity": patch
---

Three fixes carried over from the app this layer was extracted from, where they were
found in production.

**A dead access token on wake is recovered, not mourned.** The wake resync settled the
session as `expired` the moment it found the access token gone or past its expiry —
even though the refresh cookie sitting next to it says the session is alive for another
month, and even though bootstrap already knows how to trade that cookie for a new token
on the browser-restart path. On a phone that is the common case, not the edge one: hide
the browser for twenty minutes, come back, and a perfectly good session asked for the
password again. `resync()` now runs the same refresh-token exchange before giving up,
and only a backend that refuses it ends the session. The two endings are told apart by
their reason — `wake-expired` when there was no refresh session left to try,
`wake-recovery-failed` when the exchange was refused — so an app can say which happened.
A network failure ends nothing: `unreachable` is not an answer, so the session is left
exactly as it was and the next wake event tries again. Recovery is single-flight
(`visibilitychange` and `focus` routinely fire together) and does not consult the idle
gate: a token that is already dead is not a live session being silently extended.
`pageshow` joins visibility/focus/online as a wake trigger, which is how a page returning
from the bfcache announces itself.

`createTokenLifecycle` takes the two new seams as optional deps, so a lifecycle built
without them behaves exactly as it did before.

**The permission scope chain accepts a fragment that stops one level down.** A GraphQL
selection spells the chain out to a fixed depth, so the inner node is a narrower type
than the outer one and the old `T extends PermissionScope<T>` constraint rejected the
exact shape a server sends. The interface recurses through itself now, and takes a chain
of any depth, complete or cut short.

**`scopeChainHasAnyPermission` joins `scopeChainSatisfies` in the identity core.** A
backend that answers a scoped query with a derived row — one carrying no permissions of
its own, with the real grant hanging off `inheritsFrom` — makes a shell that reads
`scope.permissions` conclude "no grant at all" and throw 403 at someone who owns the
parent scope. The new helper answers the coarse "may this reader be here?" question by
walking the chain, the way the fine-grained check already did.
