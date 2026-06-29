// uno.config.ts — @director/ui design tokens + theme.
// Ported from firesport; the single source of truth for the @director/* product line.
// Consuming apps re-export this from their own uno.config so @unocss/nuxt can discover it.

import {
  defineConfig,
  presetTypography,
  presetWind3,
} from "unocss";

import transformerCompileClass, { type CompileClassOptions } from "@unocss/transformer-compile-class";
import transformerVariantGroup from "@unocss/transformer-variant-group";

import { colorsPalette } from "./uno.colors";
import {
  resolveVariableColor,
} from "./uno.variables";
import { preflights } from "./uno.preflight";

const transformerCompileClassConfig: CompileClassOptions = {
  classPrefix: "d-",
  keepUnknown: true,
};

const transformers = [
  transformerVariantGroup(),
];

const shouldCompileClass = process.env.UNO_COMPILE === "true";
if (shouldCompileClass) {
  transformers.push(transformerCompileClass(transformerCompileClassConfig));
}

export default defineConfig({

  presets: [
    presetWind3(), // required
    presetTypography(),
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

      // Semantic colors
      primary: colorsPalette.sky,
      secondary: colorsPalette.gray,

      info: colorsPalette.sky,
      success: { ...colorsPalette.green },
      warn: colorsPalette.orange,
      error: colorsPalette.red,
    },
  },

  shortcuts: {
    //
    // Semantic shortcuts
    //
    "ring-error": "ring-error-500 dark:(ring-error-400)",

    //
    // Typography
    //
    "typography": "prose prose-truegray dark:(prose-invert)",

    //
    // Component shortcuts
    //

    // Checkbox
    "cmp-checkbox-bg": "vbg-gray-50 dark:(vbg-gray-800)",
    "cmp-checkbox-ring": "cmp-input-ring",
    "cmp-checkbox-ring-default": "cmp-input-ring-default",

    // Input
    "cmp-input-text": "vtext-ui-text placeholder:vtext-ui-text-3",
    "cmp-input-text-size": "text-base/6 sm:text-sm/6",
    "cmp-input-bg": "appearance-none shadow vbg-gray-50 transition-shadow disabled:(cursor-not-allowed vbg-gray-100) focus:(outline-none outline-0) dark:(vbg-gray-800)",
    "cmp-input-rounded": "rounded-md",
    "cmp-input-ring": "ring-1 ring-inset focus:ring-2",
    "cmp-input-ring-default": "ring-gray-300 focus:ring-blue dark:(ring-gray-700)",
    "cmp-input-ring-error": "ring-error focus:ring-error",

    // Select
    "cmp-select-trigger-text": "vtext-ui-text",
    "cmp-select-trigger-text-size": "text-sm",
    "cmp-select-trigger-bg": "cmp-input-bg",
    "cmp-select-trigger-rounded": "cmp-input-rounded",
    "cmp-select-trigger-ring": "cmp-input-ring",
    "cmp-select-trigger-ring-default": "cmp-input-ring-default",
    "cmp-select-icon": "group-data-[state=open]:rotate-180 transition-transform",
    "cmp-select-icon-color": "vtext-ui-text-3",
    "cmp-select-content": "relative z-1000",
    "cmp-select-content-bg": "vbg-gray-50 dark:(vbg-gray-800)",
    "cmp-select-content-text": "vtext-ui-text",
    "cmp-select-content-ring": "cmp-input-ring",
    "cmp-select-content-ring-default": "cmp-input-ring-default",
    "cmp-select-content-shadow": "shadow-md",
    "cmp-select-content-rounded": "cmp-input-rounded",
    "cmp-select-content-popper": "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
    "cmp-select-viewport-padding": "p-1",
    "cmp-select-viewport-popper": "w-full h-[--reka-select-trigger-height] min-w-[--reka-select-trigger-width]",
    "cmp-select-viewport-separator": "w-full border-b border-gray-300 dark:(border-gray-700)",

    // Combobox
    "cmp-combobox-root": "relative mx-auto mt-2",
    "cmp-combobox-anchor": "h-8 w-full inline-flex items-center justify-between gap-[5px] border border-gray-200 rounded-md bg-white px-4 py-2 text-[13px] leading-none outline-none vtext-ui-text-1 dark:(border-gray-700 bg-gray-800) sm:(px-3 py-1) data-[placeholder]:text-gray-400",
    "cmp-combobox-trigger": "bg-transparent cmp-select-icon",
    "cmp-combobox-trigger-icon": "size-4 cmp-select-icon-color",

    // Dropdown Menu
    "cmp-dropdownmenu-content": "z-1000 min-w-32",
    "cmp-dropdownmenu-content-bg": "vbg-gray-50 dark:(vbg-gray-800)",
    "cmp-dropdownmenu-content-padding": "p-2",
    "cmp-dropdownmenu-content-shadow": "shadow-md",
    "cmp-dropdownmenu-content-rounded": "rounded-md",
    "cmp-dropdownmenu-content-ring": "cmp-input-ring ring-gray-300 dark:(ring-gray-700)",
  },

  preflights: [
    {
      layer: "theme",
      getCSS: _ => preflights(),
    },
  ],

  rules: [
    ["highlight", { "box-shadow": "var(--ui-shadow-highlight)" }],
    ["shadow-highlight", { "--un-shadow": "var(--ui-shadow-highlight)" }],

    [
      /^vbg-(.+)$/,
      resolveVariableColor("background-color", "bg"),
      { autocomplete: ["vbg-$colors", "vbg-$colors/<opacity>"] },
    ],
    [
      /^vtext-(.+)$/,
      resolveVariableColor("color", "text"),
      { autocomplete: ["vtext-$colors", "vtext-$colors/<opacity>"] },
    ],
  ],

  transformers,

  content: {
    pipeline: {
      include: [
        /\.(vue|js|ts)($|\?)/,
      ],
      exclude: [
        /node_modules/,
        /.nuxt/,
      ],
    },
  },
});
