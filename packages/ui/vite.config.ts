import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import unocss from "@unocss/vite";

// Vite config used by Histoire to render @director/ui components in isolation.
// Note: this is a plain Vite/Vue context, NOT Nuxt — components shown in Histoire
// cannot rely on Nuxt auto-imports (#imports, auto-registered composables). Keep
// story-rendered components self-contained, or add the needed imports explicitly.
export default defineConfig({
  plugins: [
    vue(),
    unocss({ configFile: "./uno.config.ts" }),
  ],
});
