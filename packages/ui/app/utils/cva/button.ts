import { cva } from "class-variance-authority";

// Placeholder button styles for the scaffold. Replace as part of the real component rewrite.
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors disabled:(opacity-50 cursor-not-allowed) focus:(outline-none ring-2 ring-offset-2)",
  {
    variants: {
      variant: {
        solid: "",
        outline: "ring-1 ring-inset bg-transparent",
        ghost: "bg-transparent",
      },
      color: {
        primary: "",
        secondary: "",
        error: "",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    compoundVariants: [
      { variant: "solid", color: "primary", class: "vbg-primary-600 vtext-white hover:vbg-primary-700" },
      { variant: "solid", color: "secondary", class: "vbg-secondary-600 vtext-white hover:vbg-secondary-700" },
      { variant: "solid", color: "error", class: "vbg-error-600 vtext-white hover:vbg-error-700" },
      { variant: "outline", color: "primary", class: "ring-primary-600 vtext-primary-700 hover:vbg-primary-50" },
      { variant: "outline", color: "secondary", class: "ring-secondary-400 vtext-ui-text hover:vbg-secondary-50" },
      { variant: "outline", color: "error", class: "ring-error-600 vtext-error-700 hover:vbg-error-50" },
      { variant: "ghost", color: "primary", class: "vtext-primary-700 hover:vbg-primary-50" },
      { variant: "ghost", color: "secondary", class: "vtext-ui-text hover:vbg-secondary-100" },
      { variant: "ghost", color: "error", class: "vtext-error-700 hover:vbg-error-50" },
    ],
    defaultVariants: {
      variant: "solid",
      color: "primary",
      size: "md",
    },
  },
);
