"use client";

import { cva, VariantProps } from "class-variance-authority";
import classNames from "classnames";
import React, { forwardRef } from "react";

type ButtonVariants = VariantProps<typeof buttonVariants>;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariants {
  disabled?: boolean;
}

export const buttonVariants = cva(
  [
    "relative",
    "text-sm focus:z-10 focus:ring-2 font-medium  focus:outline-none whitespace-nowrap shadow-sm",
    "inline-flex gap-2 items-center justify-center transition-colors focus:ring-offset-1",
    "disabled:opacity-20 disabled:cursor-not-allowed disabled:dark:text-nb-gray-300 dark:ring-offset-neutral-950/50",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-white hover:text-black focus:ring-zinc-200/50  hover:bg-gray-100 border-gray-200 text-gray-900",
          "dark:focus:ring-zinc-800/50 dark:bg-nb-gray dark:text-gray-400 dark:border-gray-700/30 dark:hover:text-white dark:hover:bg-zinc-800/50",
        ],
        primary: [
          "dark:focus:ring-netbird-600/50 dark:ring-offset-neutral-950/50 enabled:dark:bg-netbird disabled:dark:bg-nb-gray-920 dark:text-gray-100 enabled:dark:hover:text-white enabled:dark:hover:bg-netbird-500/80",
          "enabled:bg-netbird enabled:text-white enabled:focus:ring-netbird-400/50 enabled:hover:bg-netbird-500",
        ],
        secondary: [
          "bg-white hover:text-black focus:ring-zinc-200/50 hover:bg-gray-100 border-gray-200 text-gray-900",
          "dark:ring-offset-neutral-950/50 dark:focus:ring-neutral-500/20  ",
          "dark:bg-nb-gray-900/30 dark:text-gray-400 dark:border-gray-700/40 dark:hover:text-white dark:hover:bg-zinc-800/50",
        ],
        input: [
          "bg-white hover:text-black focus:ring-zinc-200/50 hover:bg-gray-100 border-neutral-200 text-gray-900",
          "dark:ring-offset-neutral-950/50 dark:focus:ring-neutral-500/20  ",
          "dark:bg-nb-gray-900  dark:text-gray-400  dark:border-nb-gray-700 dark:hover:bg-nb-gray-900/80",
        ],
        dotted: [
          "bg-white hover:text-black focus:ring-zinc-200/50 hover:bg-gray-100 border-gray-200 text-gray-900 border-dashed",
          "dark:ring-offset-neutral-950/50 dark:focus:ring-neutral-500/20  ",
          "dark:bg-nb-gray-900/30 dark:text-gray-400 dark:border-gray-500/40 dark:hover:text-white dark:hover:bg-zinc-800/50",
        ],
        tertiary: [
          "bg-white hover:text-black focus:ring-zinc-200/50  hover:bg-gray-100 border-gray-200 text-gray-900",
          "dark:focus:ring-zinc-800/50 dark:bg-white dark:text-gray-800 dark:border-gray-700/40 dark:hover:bg-neutral-200 disabled:dark:bg-nb-gray-920 disabled:dark:text-nb-gray-300",
        ],
        outline: [
          "bg-white hover:text-black focus:ring-zinc-200/50  hover:bg-gray-100 border-gray-200 text-gray-900",
          "dark:focus:ring-zinc-800/50 dark:bg-transparent dark:text-netbird dark:border-netbird dark:hover:bg-nb-gray-900/30",
        ],
        "danger-outline": [
          "", // TODO - add danger button styles for light mode
          "enabled:dark:focus:ring-red-800/20 enabled:dark:focus:bg-red-950/40 enabled:hover:dark:bg-red-950/50 enabled:dark:hover:border-red-800/50 dark:bg-transparent dark:text-red-500",
          "",
        ],
        "default-outline": [
          "dark:ring-offset-neutral-950/50 dark:focus:ring-neutral-500/20",
          "dark:bg-transparent dark:text-nb-gray-400 dark:border-transparent dark:hover:text-white dark:hover:bg-zinc-800/50 dark:hover:border-nb-gray-800/50",
        ],
        danger: [
          "", // TODO - add danger button styles for light mode
          "dark:focus:ring-red-700/20 dark:focus:bg-red-700 hover:dark:bg-red-700 dark:hover:border-red-800/50 dark:bg-red-600 dark:text-red-100",
        ],
      },
      size: {
        xs: "text-xs py-2 px-4",
        sm: "text-sm py-2.5 px-4",
        md: "text-md py-2.5 px-4",
        lg: "text-lg py-2.5 px-4",
      },
      rounded: {
        true: "rounded-md",
        false: "",
      },
      border: {
        0: "border",
        1: "border border-transparent",
        2: "border border-t-0 border-b-0",
      },
    },
  },
);

const Button = forwardRef(
  (
    {
      variant = "default",
      rounded = true,
      border = 1,
      size = "md",
      ...props
    }: ButtonProps,
    ref: React.ForwardedRef<HTMLButtonElement>,
  ) => {
    return (
      <button
        type="button"
        {...props}
        ref={ref}
        className={classNames(
          buttonVariants({
            variant,
            rounded,
            border: border ? 1 : 0,
            size: size,
          }),
          props.className,
        )}
        onClick={(e) => {
          e.stopPropagation();
          props.onClick && props.onClick(e);
        }}
      >
        {props.children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
