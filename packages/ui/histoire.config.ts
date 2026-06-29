import { defineConfig } from "histoire";
import { HstVue } from "@histoire/plugin-vue";

export default defineConfig({
  plugins: [HstVue()],
  setupFile: "./histoire.setup.ts",
  storyMatch: ["app/**/*.story.vue"],
  theme: {
    title: "@director/ui",
  },
});
