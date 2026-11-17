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
        "rounded-lg border border-nb-gray-700 dark:border-nb-gray-900 overflow-hidden flex items-center justify-center shrink-0",
        disabled ? "opacity-100 !border-nb-gray-900/20" : "",
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
        rounded={false}
        className={cn(
          /* Separators are the buttons' own side borders, in the variant's
             border colour (a divide-x on the group loses to them). Light mode
             draws one per gap; dark mode keeps both sides, so callers thin a
             gap to one line with !border-l-0. */
          "border-y-0 border-l-0 last:border-r-0 dark:border-l dark:first:border-l-0",
          "h-[40px]",
          "!py-2.5 !px-4",
          /* Light mode marks the selected button by colour; dark mode already
             does through the tertiary variant. The dark overrides only apply
             to enabled buttons, so a disabled selection keeps its dimmed
             disabled look. */
          "aria-pressed:bg-neutral-800 aria-pressed:text-white aria-pressed:hover:bg-neutral-700 aria-pressed:hover:text-white",
          "dark:enabled:aria-pressed:bg-white dark:enabled:aria-pressed:text-gray-800 dark:enabled:aria-pressed:hover:bg-neutral-200 dark:enabled:aria-pressed:hover:text-gray-800",
          className,
        )}
      />
    );
  },
);

ButtonGroupButton.displayName = "ButtonGroupButton";

ButtonGroup.Button = ButtonGroupButton;

export default ButtonGroup;
