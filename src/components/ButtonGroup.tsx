import Button, { type ButtonProps } from "@components/Button";
import { cn } from "@utils/helpers";
import React, { forwardRef } from "react";

type Props = {
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
};

function ButtonGroup({ children, disabled, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-lg border border-nb-gray-700 divide-x divide-nb-gray-700 dark:border-nb-gray-800 dark:divide-nb-gray-800 overflow-hidden flex items-center justify-center shrink-0",
        disabled ? "opacity-100 !border-nb-gray-900/20 !divide-nb-gray-900/20" : "",
        className,
      )}
    >
      {children}
    </div>
  );
}

const ButtonGroupButton = forwardRef(
  (
    { className, variant, ...props }: ButtonProps,
    ref: React.ForwardedRef<HTMLButtonElement>,
  ) => {
    return (
      <Button
        ref={ref}
        aria-pressed={
          variant === "tertiary" ? true : variant === "secondary" ? false : undefined
        }
        {...props}
        variant={variant}
        border={0}
        rounded={false}
        className={cn(
          "h-[40px]",
          "!py-2.5 !px-4",
          "aria-pressed:bg-neutral-800 aria-pressed:text-white aria-pressed:hover:bg-neutral-700 aria-pressed:hover:text-white",
          "dark:aria-pressed:bg-white dark:aria-pressed:text-gray-800 dark:aria-pressed:hover:bg-neutral-200 dark:aria-pressed:hover:text-black",
          className,
        )}
      />
    );
  },
);

ButtonGroupButton.displayName = "ButtonGroupButton";

ButtonGroup.Button = ButtonGroupButton;

export default ButtonGroup;
