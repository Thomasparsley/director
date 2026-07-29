import { fileURLToPath } from "node:url";

/** The minimal Nuxt app the integration tier runs against. */
export const fixtureDir = fileURLToPath(new URL("../fixture", import.meta.url));
