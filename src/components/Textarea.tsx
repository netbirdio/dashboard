import Paragraph from "@components/Paragraph";
import { cn } from "@utils/helpers";
import { cva, VariantProps } from "class-variance-authority";
import * as React from "react";

type TextareaVariants = VariantProps<typeof inputVariants>;

export interface InputProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    TextareaVariants {
  error?: string;
  customElement?: React.ReactNode;
  resize?: boolean;
}

const inputVariants = cva("", {
  variants: {
    variant: {
      default: [
        "dark:bg-nb-gray-900 dark:placeholder:text-neutral-400/70 placeholder:text-neutral-500 border-neutral-200 dark:border-nb-gray-700",
        "ring-offset-neutral-200/20 dark:ring-offset-neutral-950/50 dark:focus-visible:ring-neutral-500/20 focus-visible:ring-neutral-300/10",
      ],
      darker: [
        "dark:bg-nb-gray-900/40 dark:placeholder:text-neutral-400/70 placeholder:text-neutral-500 border-neutral-200 dark:border-nb-gray-900",
        "ring-offset-neutral-200/20 dark:ring-offset-neutral-950/50 dark:focus-visible:ring-neutral-500/20 focus-visible:ring-neutral-300/10",
      ],
      error: [
        "dark:bg-red-950/30 dark:placeholder:text-red-400/70 placeholder:text-red-500 border-red-500 dark:border-red-500 text-red-500",
        "ring-offset-red-500/10 dark:ring-offset-red-500/10 dark:focus-visible:ring-red-500/10 focus-visible:ring-red-500/10",
      ],
    },
  },
});

const Textarea = React.forwardRef<HTMLTextAreaElement, InputProps>(
  (
    { className, variant = "default", resize, customElement, error, ...props },
    ref,
  ) => {
    return (
      <>
        <div className={cn("flex relative")}>
          <textarea
            ref={ref}
            {...props}
            className={cn(
              inputVariants({ variant: error ? "error" : variant }),
              "flex w-full min-h-[42px] rounded-md bg-white px-3 pb-3 pt-2.5 text-sm file:bg-transparent file:text-sm file:font-medium  focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50  ",
              "file:border-0",
              "focus-visible:ring-2 focus-visible:ring-offset-2",
              "border",
              "overflow-hidden",
              className,
              resize ? "resize" : "resize-none",
            )}
            style={{
              height: variant === "darker" ? "42px" : "auto",
            }}
          />
          {customElement && customElement}
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

Textarea.displayName = "Textarea";
export { Textarea };
