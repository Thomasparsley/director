---
"@directorkit/common": minor
"@directorkit/ui": minor
"@directorkit/core": minor
"@directorkit/forms": minor
"@directorkit/form-ui": minor
"@directorkit/filters": minor
"@directorkit/dialogs": minor
"@directorkit/identity": minor
---

First public release. The `@directorkit/*` layers now publish to npm under the MIT
license (ADR-0020): every package carries its own README and npm metadata, and the
`postinstall: nuxt prepare` hook — which would have run inside every consumer's
`node_modules` — is now a root-level `dev:prepare`.
