import FullTooltip from "@components/FullTooltip";
import Paragraph from "@components/Paragraph";
import { cn } from "@utils/helpers";
import { cva, VariantProps } from "class-variance-authority";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { useState } from "react";

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
  errorTooltipPosition?: "top" | "top-right" | "bottom";
  prefixClassName?: string;
  showPasswordToggle?: boolean;
}

const inputVariants = cva("", {
  variants: {
    variant: {
      default: [
        "dark:bg-nb-gray-900 dark:placeholder:text-neutral-400/70 placeholder:text-neutral-500 border-neutral-200 dark:border-nb-gray-700",
        "ring-offset-neutral-200/20 dark:ring-offset-neutral-950/50 dark:focus-visible:ring-neutral-500/20 focus-visible:ring-neutral-300/10",
      ],
      darker: [
        "dark:bg-nb-gray-920 dark:placeholder:text-neutral-400/70 placeholder:text-neutral-500 border-neutral-300 dark:border-nb-gray-800",
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
      errorTooltip = false,
      errorTooltipPosition = "top",
      variant = "default",
      prefixClassName,
      showPasswordToggle = false,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === "password";
    const inputType = isPasswordType && showPassword ? "text" : type;

    const passwordToggle =
      isPasswordType && showPasswordToggle ? (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className={"hover:text-white transition-all"}
          aria-label={"Toggle password visibility"}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      ) : null;

    const suffix = passwordToggle || customSuffix;

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
                props.disabled && "opacity-40",
                prefixClassName,
              )}
            >
              {customPrefix}
            </div>
          )}

          <div
            className={cn(
              "absolute left-0 top-0 h-full flex items-center text-xs dark:text-nb-gray-300 pl-3 leading-[0]",
              props.disabled && "opacity-40",
            )}
          >
            {icon}
          </div>

          <input
            type={inputType}
            ref={ref}
            {...props}
            className={cn(
              inputVariants({ variant: error ? "error" : variant }),
              "flex h-[42px] w-full rounded-md  bg-white px-3 py-2 text-sm file:bg-transparent file:text-sm file:font-medium  focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40  ",
              "file:border-0",
              "focus-visible:ring-2 focus-visible:ring-offset-2",
              customPrefix && "!border-l-0 !rounded-l-none",
              suffix && "!pr-16",
              icon && "!pl-10",
              "border",
              className,
            )}
          />

          <div
            className={cn(
              "absolute right-0 top-0 h-full flex items-center text-xs dark:text-nb-gray-300 pr-4 leading-[0] select-none",
              props.disabled && "opacity-30",
            )}
          >
            {suffix}
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
