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
        "rounded-lg border-[1px] dark:border-nb-gray-900 border-neutral-200 overflow-hidden flex items-center justify-center shrink-0 border-separate",
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
    { className, ...props }: ButtonProps,
    ref: React.ForwardedRef<HTMLButtonElement>,
  ) => {
    return (
      <Button
        ref={ref}
        {...props}
        border={2}
        rounded={false}
        className={cn(
          "first:border-l-0 last:border-r-0 border-t-0 border-b-0 h-[40px]",
          "!py-2.5 !px-4",
          className,
        )}
      />
    );
  },
);

ButtonGroupButton.displayName = "ButtonGroupButton";

ButtonGroup.Button = ButtonGroupButton;

export default ButtonGroup;
