// uno.config.ts — @director/ui theme. Two tiers, split on how a value flips for dark mode:
//
//   1. The palette (ported from firesport) is exposed directly through the UnoCSS theme —
//      `bg-primary-600`, `text-gray-900`, `dark:text-gray-50`. Use this in markup.
//   2. The `vtext-`/`vbg-` ramp below is color-mode aware: same CSS variable under `:root`
//      and `.dark`, so it flips with no `dark:` variant. Use it in cva strings, where a
//      `dark:` twin for every rule would be noise.
//
// What went away with the firesport import: the separate uno.variables.ts / uno.preflight.ts
// files and the `cmp-*` component shortcuts — the latter competed with cva for the same job.
// The `vtext-`/`vbg-` rules survived, inline, because tier 2 earns its keep.
//
// Consuming apps re-export this from their own uno.config so @unocss/nuxt can discover it.
// See docs/adr/0007-design-tokens-palette-in-the-uno-theme.md.

import {
  defineConfig,
  presetTypography,
  presetWind4,
} from "unocss";

import transformerCompileClass, { type CompileClassOptions } from "@unocss/transformer-compile-class";
import transformerVariantGroup from "@unocss/transformer-variant-group";

import { colorsPalette } from "./uno.colors";

const transformerCompileClassConfig: CompileClassOptions = {
  classPrefix: "d-",
  keepUnknown: true,
};

const transformers = [
  transformerVariantGroup(),
];

if (process.env.UNO_COMPILE === "true") {
  transformers.push(transformerCompileClass(transformerCompileClassConfig));
}

const { gray, green } = colorsPalette;

// Color-mode aware tokens: [light-mode value, dark-mode value].
// The same CSS variable is declared under `:root` (light) and `.dark`, so
// `var(--vtext-*)` / `var(--vbg-*)` flip automatically when the dark class
// toggles — no `dark:` variant needed in markup.

// Foreground (text) tokens. vtext-1 = strongest, climbing down to muted.
const vtextTokens: Record<string, [string, string]> = {
  1: [gray[900], gray[50]],
  2: [gray[700], gray[200]],
  3: [gray[600], gray[400]],
  4: [gray[500], gray[500]],
  // Semantic component tokens.
  neutral: [gray[900], gray[50]],
  green: [green[800], green[100]],
};

// Background tokens.
const vbgTokens: Record<string, [string, string]> = {
  neutral: [gray[200], gray[800]],
};

export default defineConfig({

  content: {
    pipeline: {
      // UnoCSS's default include list scans .vue/.tsx/etc. but NOT plain .ts/.js.
      // Our component class strings live in cva files (e.g. button.variants.ts), so
      // without this the layer components ship unstyled. Keep the defaults and add
      // plain .ts/.js. https://unocss.dev/guide/extracting
      include: [
        /\.(vue|svelte|[jt]sx|vine\.ts|mdx?|astro|elm|php|phtml|marko|html)($|\?)/,
        /\.[jt]s($|\?)/,
      ],
    },
  },

  presets: [
    presetWind4(),
    presetTypography(),
  ],

  rules: [
    // vtext-1, vtext-neutral, ... -> color: var(--vtext-*)
    [/^vtext-([\w-]+)$/, ([, n]) => ({ "color": `var(--vtext-${n})` })],
    // vbg-neutral, ... -> background-color: var(--vbg-*)
    [/^vbg-([\w-]+)$/, ([, n]) => ({ "background-color": `var(--vbg-${n})` })],
  ],

  preflights: [
    {
      getCSS: () => {
        const decls = (idx: 0 | 1) => [
          ...Object.entries(vtextTokens).map(([k, v]) => `--vtext-${k}: ${v[idx]};`),
          ...Object.entries(vbgTokens).map(([k, v]) => `--vbg-${k}: ${v[idx]};`),
        ].join(" ");

        return `:root { ${decls(0)} }\n.dark { ${decls(1)} }`;
      },
    },
  ],

  theme: {
    colors: {
      red: { ...colorsPalette.red },
      orange: { ...colorsPalette.orange },
      green: { ...colorsPalette.green },
      blue: { ...colorsPalette.blue },
      sky: { ...colorsPalette.sky },
      gray: { ...colorsPalette.gray },

      black: colorsPalette.black,
      white: colorsPalette.white,

      // Semantic aliases
      primary: { ...colorsPalette.sky },
      secondary: { ...colorsPalette.gray },
      info: { ...colorsPalette.sky },
      success: { ...colorsPalette.green },
      warn: { ...colorsPalette.orange },
      error: { ...colorsPalette.red },
    },
  },

  transformers,
});
