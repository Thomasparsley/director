import { colorsPalette } from "./uno.colors";
import {
  createColorVariable,
  createVariableColorPallete,
  mapColorPalleteToVariables,
  mapColorToVariable,
} from "./uno.variables";

const varWrapper = (v: string) => `var(${v})` as const;

type ColorVairableArgs = {
  variable: string
  shade?: string | number
  color: string
  colorShade?: string | number
};
const makeColorVairable = ({ variable, shade, color, colorShade }: ColorVairableArgs) =>
  mapColorToVariable(varWrapper(createColorVariable(color, colorShade)), variable, shade);

const themeLight = {
  ui: {
    text: {
      type: "color",
      items: [
        { variable: "ui-text", color: "gray", colorShade: 900 },
        { variable: "ui-text", shade: 1, color: "gray", colorShade: 800 },
        { variable: "ui-text", shade: 2, color: "gray", colorShade: 700 },
        { variable: "ui-text", shade: 3, color: "gray", colorShade: 600 },
        { variable: "ui-text", shade: 4, color: "gray", colorShade: 500 },
      ] as const satisfies ColorVairableArgs[],
    },
    bg: {
      type: "color",
      items: [
        { variable: "ui-bg", color: "gray", colorShade: 50 },
        { variable: "ui-bg", shade: 1, color: "gray", colorShade: 200 },
        { variable: "ui-bg", shade: 2, color: "gray", colorShade: 300 },
        { variable: "ui-bg", shade: 3, color: "gray", colorShade: 400 },
        { variable: "ui-bg", shade: 4, color: "gray", colorShade: 500 },
      ] as const satisfies ColorVairableArgs[],
    },
    card: {
      bg: {
        type: "color",
        items: [
          { variable: "ui-bg-card", color: "white" },
          { variable: "ui-bg-card", shade: 1, color: "gray", colorShade: 100 },
          { variable: "ui-bg-card", shade: 2, color: "gray", colorShade: 200 },
        ] as const satisfies ColorVairableArgs[],
      },
    },
  },
} as const;

const themeDark = {
  semantic: {
    colors: {
      info: {
        type: "color",
        items: [
          { variable: "info", color: "sky", colorShade: 400 },
        ] as const satisfies ColorVairableArgs[],
      },
      success: {
        type: "color",
        items: [
          { variable: "success", color: "green", colorShade: 400 },
        ] as const satisfies ColorVairableArgs[],
      },
      warning: {
        type: "color",
        items: [
          { variable: "warn", color: "orange", colorShade: 400 },
        ] as const satisfies ColorVairableArgs[],
      },
      error: {
        type: "color",
        items: [
          { variable: "error", color: "red", colorShade: 400 },
        ] as const satisfies ColorVairableArgs[],
      },
    },
  },
  ui: {
    text: {
      type: "color",
      items: [
        { variable: "ui-text", color: "white" },
        { variable: "ui-text", shade: 1, color: "gray", colorShade: 200 },
        { variable: "ui-text", shade: 2, color: "gray", colorShade: 300 },
        { variable: "ui-text", shade: 3, color: "gray", colorShade: 400 },
        { variable: "ui-text", shade: 4, color: "gray", colorShade: 500 },
      ] as const satisfies ColorVairableArgs[],
    },
    bg: {
      type: "color",
      items: [
        { variable: "ui-bg", color: "gray", colorShade: 950 },
        { variable: "ui-bg", shade: 1, color: "gray", colorShade: 900 },
        { variable: "ui-bg", shade: 2, color: "gray", colorShade: 800 },
        { variable: "ui-bg", shade: 3, color: "gray", colorShade: 700 },
        { variable: "ui-bg", shade: 4, color: "gray", colorShade: 600 },
      ] as const satisfies ColorVairableArgs[],
    },
    card: {
      bg: {
        type: "color",
        items: [
          { variable: "ui-bg-card", color: "gray", colorShade: 900 },
          { variable: "ui-bg-card", shade: 1, color: "gray", colorShade: 800 },
          { variable: "ui-bg-card", shade: 2, color: "gray", colorShade: 700 },
        ] as const satisfies ColorVairableArgs[],
      },
    },
  },
} as const;

export const preflights = () => `
:root {
  ${mapColorPalleteToVariables(colorsPalette.red, "red")}
  ${mapColorPalleteToVariables(colorsPalette.orange, "orange")}
  ${mapColorPalleteToVariables(colorsPalette.green, "green")}
  ${mapColorPalleteToVariables(colorsPalette.blue, "blue")}
  ${mapColorPalleteToVariables(colorsPalette.sky, "sky")}
  ${mapColorPalleteToVariables(colorsPalette.gray, "gray")}

  ${mapColorToVariable(colorsPalette.white, "white")}
  ${mapColorToVariable(colorsPalette.black, "black")}

  ${mapColorPalleteToVariables(createVariableColorPallete("sky", "primary"), "primary", varWrapper)}
  ${mapColorPalleteToVariables(createVariableColorPallete("gray", "secondary"), "secondary", varWrapper)}

  ${mapColorPalleteToVariables(createVariableColorPallete("sky", "info"), "info", varWrapper)}
  ${mapColorPalleteToVariables(createVariableColorPallete("green", "success"), "success", varWrapper)}
  ${mapColorPalleteToVariables(createVariableColorPallete("orange", "warn"), "warn", varWrapper)}
  ${mapColorPalleteToVariables(createVariableColorPallete("red", "error"), "error", varWrapper)}

  ${themeLight.ui.text.items.map(makeColorVairable).join("\n  ")}
  ${themeLight.ui.bg.items.map(makeColorVairable).join("\n  ")}

  ${themeLight.ui.card.bg.items.map(makeColorVairable).join("\n  ")}

  --ui-shadow-highlight: inset 1px 1px 2px 0 rgba(153,174,214,0.1), inset 0 0 2px 0 rgba(153,174,214,0.1);
  --ui-shadow-highlight-thumbnail: inset 1px 1px 6px 0 rgba(153,174,214,0.33), inset 0 0 3px 0 rgba(153,174,214,0.33);
}

.dark {
  ${themeDark.semantic.colors.info.items.map(makeColorVairable).join("\n  ")}
  ${themeDark.semantic.colors.success.items.map(makeColorVairable).join("\n  ")}
  ${themeDark.semantic.colors.warning.items.map(makeColorVairable).join("\n  ")}
  ${themeDark.semantic.colors.error.items.map(makeColorVairable).join("\n  ")}

  ${themeDark.ui.text.items.map(makeColorVairable).join("\n  ")}
  ${themeDark.ui.bg.items.map(makeColorVairable).join("\n  ")}

  ${themeDark.ui.card.bg.items.map(makeColorVairable).join("\n  ")}
}
`;
