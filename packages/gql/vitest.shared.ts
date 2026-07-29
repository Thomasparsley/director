import { fileURLToPath } from "node:url";

import type { Plugin } from "vite";

const packageRoot = fileURLToPath(new URL(".", import.meta.url));

/**
 * `import.meta.server` / `client` / `dev` only exist inside a Nuxt build, and they are
 * compile-time constants there — a spec cannot assign to them, and Vite's `define` does
 * not reach them through Vitest's SSR transform. Rewriting them to globals is what lets
 * `test/nuxtApp.ts#setRenderSide` flip sides per test, which is the only way one suite
 * can exercise both the SSR and the hydration path of the same code.
 */
export function nuxtImportMeta(): Plugin {
  return {
    name: "director-gql:nuxt-import-meta",
    enforce: "pre",
    transform(code, id) {
      if (!id.startsWith(`${packageRoot}app/`) || !code.includes("import.meta.")) {
        return null;
      }

      return {
        code: code
          .replace(/import\.meta\.server/g, "(globalThis.__NUXT_SERVER__ === true)")
          .replace(/import\.meta\.client/g, "(globalThis.__NUXT_CLIENT__ === true)")
          .replace(/import\.meta\.dev/g, "true"),
        map: null,
      };
    },
  };
}

/**
 * The layer aliases Nuxt would have generated. `#app` only exists inside a Nuxt build,
 * so specs get the stub in `test/nuxtApp.ts` that re-supplies just what the layer touches
 * — the same trade as identity and dialogs (ADR-0008).
 */
export const layerAliases = {
  "#layers/director-common": fileURLToPath(new URL("../common", import.meta.url)),
  "#layers/director-gql": packageRoot,
  "#app": fileURLToPath(new URL("./test/nuxtApp.ts", import.meta.url)),
};
