// Stands in for Nuxt's `#components` virtual module. For internal `to` targets NuxtLink
// renders a RouterLink, so the real thing is the closest possible stand-in — it still produces
// a genuine <a href> we can assert on.
export { RouterLink as NuxtLink } from "vue-router";
