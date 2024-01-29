import Paragraph from "@components/Paragraph";
import { cn } from "@utils/helpers";
import { cva } from "class-variance-authority";
import * as React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  customPrefix?: React.ReactNode;
  customSuffix?: React.ReactNode;
  maxWidthClass?: string;
  icon?: React.ReactNode;
  error?: string;
}

const inputVariants = cva("", {
  variants: {
    variant: {
      default: [
        "dark:bg-nb-gray-900 dark:placeholder:text-neutral-400/70 placeholder:text-neutral-500 border-neutral-200 dark:border-nb-gray-700",
        "ring-offset-neutral-200/20 dark:ring-offset-neutral-950/50 dark:focus-visible:ring-neutral-500/20 focus-visible:ring-neutral-300/10",
      ],
      error: [
        "dark:bg-nb-gray-900 dark:placeholder:text-neutral-400/70 placeholder:text-neutral-500 border-neutral-200 dark:border-red-500 text-red-500",
        "ring-offset-red-500/10 dark:ring-offset-red-500/10 dark:focus-visible:ring-red-500/10 focus-visible:ring-red-500/10",
      ],
    },
    prefixSuffixVariant: {
      default: [
        "dark:bg-nb-gray-900 border-neutral-200 dark:border-nb-gray-700 text-nb-gray-300",
      ],
      error: [
        "dark:bg-nb-gray-900 border-red-500 text-nb-gray-300 text-red-500",
      ],
    },
  },
});

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      customSuffix,
      customPrefix,
      icon,
      maxWidthClass = "",
      error,
      ...props
    },
    ref,
  ) => {
    return (
      <>
        <div className={cn("flex relative h-[42px]", maxWidthClass)}>
          {customPrefix && (
            <div
              className={cn(
                inputVariants({
                  prefixSuffixVariant: error ? "error" : "default",
                }),
                "flex h-[42px] w-auto rounded-l-md bg-white px-3 py-2 text-sm ",
                "border  items-center whitespace-nowrap",
                props.disabled && "opacity-50",
              )}
            >
              {customPrefix}
            </div>
          )}

          <div
            className={
              "absolute left-0 top-0 h-full flex items-center text-xs dark:text-nb-gray-300 pl-3 leading-[0]"
            }
          >
            {icon}
          </div>

          <input
            type={type}
            ref={ref}
            {...props}
            className={cn(
              inputVariants({ variant: error ? "error" : "default" }),
              "flex h-[42px] w-full rounded-md  bg-white px-3 py-2 text-sm file:bg-transparent file:text-sm file:font-medium  focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-20  ",
              "file:border-0",
              "focus-visible:ring-2 focus-visible:ring-offset-2",
              customPrefix && "!border-l-0 !rounded-l-none",
              customSuffix && "!pr-16",
              icon && "!pl-10",
              "border",
              className,
            )}
          />

          <div
            className={
              "absolute right-0 top-0 h-full flex items-center text-xs dark:text-nb-gray-300 pr-4 leading-[0]"
            }
          >
            {customSuffix}
          </div>
        </div>
        {error && (
          <Paragraph className={"text-xs !text-red-500 mt-2"}>
            {error}
          </Paragraph>
        )}
      </>
    );
  },
);
Input.displayName = "Input";

export { Input };
