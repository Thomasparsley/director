---
"@director/common": minor
"@director/ui": minor
"@director/core": minor
"@director/forms": minor
"@director/form-ui": minor
"@director/filters": minor
"@director/dialogs": minor
"@director/identity": minor
---

First public release. The `@director/*` layers now publish to npm under the MIT
license (ADR-0020): every package carries its own README and npm metadata, and the
`postinstall: nuxt prepare` hook — which would have run inside every consumer's
`node_modules` — is now a root-level `dev:prepare`.
