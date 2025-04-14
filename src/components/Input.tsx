import FullTooltip from "@components/FullTooltip";
import Paragraph from "@components/Paragraph";
import { cn } from "@utils/helpers";
import { cva, VariantProps } from "class-variance-authority";
import { AlertCircle } from "lucide-react";
import * as React from "react";

type InputVariants = VariantProps<typeof inputVariants>;

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    InputVariants {
  customPrefix?: React.ReactNode;
  customSuffix?: React.ReactNode;
  maxWidthClass?: string;
  icon?: React.ReactNode;
  error?: string;
  errorTooltip?: boolean;
  errorTooltipPosition?: "top" | "top-right";
  prefixClassName?: string;
}

const inputVariants = cva(
  [
    "flex w-full min-h-[42px] rounded-md bg-white px-3 pb-3 pt-2.5 text-sm file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
    "file:border-0",
    "focus-visible:ring-2 focus-visible:ring-offset-2",
    "dark:placeholder:text-neutral-400/70 placeholder:text-neutral-500",
    "ring-offset-neutral-200/20 dark:ring-offset-neutral-950/50",
  ],
  {
    variants: {
      variant: {
        default:
          "border border-default dark:bg-nb-gray-900 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300",
        error:
          "border border-red-500/50 dark:border-red-500/50 dark:bg-nb-gray-900 focus-visible:ring-red-500/20 dark:focus-visible:ring-red-500/20",
        grey:
          "border border-default bg-gray-100 dark:bg-nb-gray-900 text-gray-500 dark:text-nb-gray-300 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300",
        ghost: "border border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

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
      errorTooltip = false,
      errorTooltipPosition = "top",
      variant = "default",
      prefixClassName,
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
                "flex h-[42px] w-auto items-center whitespace-nowrap rounded-l-md border border-r-0 bg-white px-3 py-2 text-sm",
                error
                  ? "border-red-500/50 text-red-500 dark:border-red-500/50"
                  : "border-default text-gray-500 dark:bg-nb-gray-900 dark:text-nb-gray-300",
                props.disabled && "opacity-20",
                prefixClassName,
              )}
            >
              {customPrefix}
            </div>
          )}

          <div
            className={cn(
              "absolute left-0 top-0 h-full flex items-center text-xs text-gray-500 dark:text-nb-gray-300 pl-3 leading-[0]",
              props.disabled && "opacity-30",
            )}
          >
            {icon}
          </div>

          <input
            type={type}
            ref={ref}
            {...props}
            className={cn(
              inputVariants({ variant: error ? "error" : variant }),
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
            className={cn(
              "absolute right-0 top-0 h-full flex items-center text-xs text-gray-500 dark:text-nb-gray-300 pr-4 leading-[0] select-none",
              props.disabled && "opacity-30",
            )}
          >
            {customSuffix}
          </div>
          {error && errorTooltip && (
            <div
              className={cn(
                errorTooltipPosition == "top" &&
                  "absolute right-0 top-2 h-[0px] w-full flex items-center pr-3 justify-center",
                errorTooltipPosition == "top-right" &&
                  "absolute -right-6 top-2 h-[0px] w-full flex items-center pr-3 justify-end",
              )}
            >
              <FullTooltip
                content={
                  <div className={"text-xs text-red-500 inline-flex"}>
                    <AlertCircle
                      size={13}
                      className={"top-[1px] relative mr-2"}
                    />
                    {error}
                  </div>
                }
                interactive={false}
                align={errorTooltipPosition == "top" ? "center" : "end"}
                side={"top"}
                keepOpen={true}
              >
                &nbsp;
              </FullTooltip>
            </div>
          )}
        </div>
        {error && !errorTooltip && (
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
