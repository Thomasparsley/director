import type { CSSObject, DynamicMatcher } from "unocss";

type ColorShade = string | number;

export function mapColorToVariable(
  value: string,
  name: string,
  shade?: ColorShade,
  modifier?: (v: string) => string,
) {
  if (modifier) {
    value = modifier(value);
  }
  return `${createColorVariable(name, shade)}: ${value};` as const;
}

export function mapColorPalleteToVariables(
  pallete: object,
  name: string,
  modifier: (v: string) => string = (v: string) => v,
): string {
  return Object
    .entries(pallete)
    .map(([shade, value]) => mapColorToVariable(value, name, shade, modifier))
    .join("\n  ");
}

export function createVariableColorPallete(name: string, defaultName?: string) {
  return {
    50: createColorVariable(name, 50),
    100: createColorVariable(name, 100),
    200: createColorVariable(name, 200),
    300: createColorVariable(name, 300),
    400: createColorVariable(name, 400),
    500: createColorVariable(name, 500),
    600: createColorVariable(name, 600),
    700: createColorVariable(name, 700),
    800: createColorVariable(name, 800),
    900: createColorVariable(name, 900),
    DEFAULT: createColorVariable(defaultName ?? name, 500),
  } as const;
}

export function resolveVariableColor(cssProperty: string, opacityName: string): DynamicMatcher {
  return ([, body]): CSSObject | undefined => {
    const declarations: CSSObject = {};

    const [color, shade, opacity] = parseColorSyntax(body!);
    if (!color /* || !existsVariableColor(color, shade) */) {
      return;
    }

    const colorVariable = createColorVariable(color, shade);
    const opacityVariable = createVariableOpacity(opacityName);

    declarations[cssProperty] = `color-mix(in oklab, var(${colorVariable}) var(${createVariableOpacity(opacityName)}), transparent)`;

    if (opacity) {
      declarations[opacityVariable] = parseOpacity(opacity);
    }
    else {
      declarations[opacityVariable] = "100%";
    }

    return declarations;
  };
}

export function createColorVariable<Name extends string, Shade extends ColorShade>(
  name: Name,
  shade?: Shade,
) {
  if (!shade || shade === "DEFAULT") {
    return `--clr-${name}` as const;
  }
  return `--clr-${name}-${shade}` as const;
}

function createVariableOpacity(opacityName: string) {
  return `--un-${opacityName}-opacity` as const;
}

function parseOpacity(opacity: string) {
  let number: number | undefined = undefined;
  if (opacity.includes(".")) {
    throw new Error(`Invalid opacity value: ${opacity}`);
  }
  else {
    number = parseInt(opacity, 10);
  }

  // Convert to percentage
  const percentage = number;
  if (percentage < 0 || percentage > 100) {
    throw new Error(`Invalid opacity value: ${opacity}`);
  }

  return `${percentage}%` as const;
}

function parseColorSyntax(input: string) {
  const match = input.match(/^([a-z-]+)(?:-(\d+))?(?:\/(\d+))?$/);
  if (!match) {
    return [undefined, undefined, undefined];
  }

  const [, color, shade, opacity] = match;

  return [
    color,
    !shade ? undefined : shade,
    !opacity ? undefined : opacity,
  ];
}
