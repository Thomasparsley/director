import { cva } from "class-variance-authority";

export const formFieldLabelVariants = cva(
  ":uno: block font-medium vtext-1",
  {
    variants: {
      size: {
        sm: ":uno: text-xs",
        md: ":uno: text-sm",
        lg: ":uno: text-sm",
      },
      invalid: {
        true: ":uno: text-error-600 dark:text-error-400",
        false: "",
      },
      disabled: {
        true: ":uno: opacity-50",
        false: "",
      },
    },
    defaultVariants: { size: "md", invalid: false, disabled: false },
  },
);

export const formFieldTextVariants = cva(
  ":uno: text-xs",
  {
    variants: {
      kind: {
        hint: ":uno: vtext-3",
        description: ":uno: vtext-3",
        help: ":uno: vtext-4",
        error: ":uno: text-error-600 dark:text-error-400",
      },
    },
    defaultVariants: { kind: "description" },
  },
);
