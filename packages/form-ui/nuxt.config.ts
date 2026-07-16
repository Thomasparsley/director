import { fileURLToPath } from "node:url";

// @director/form-ui — bindings between the @director/forms composables and the @director/ui
// input components. Each component takes a FormControl and wires value, error display and
// blur → transform/validate, so app code never repeats that plumbing.
// https://nuxt.com/docs/getting-started/layers
export default defineNuxtConfig({
  $meta: {
    name: "director-form-ui",
  },

  extends: [
    "@director/ui",
    "@director/forms",
  ],

  components: [
    {
      // <DFormInput>, <DFormSelect>, ... — controls bound to a FormControl.
      path: fileURLToPath(new URL("./app/components", import.meta.url)),
      prefix: "DForm",
      pathPrefix: false,
    },
  ],
});
