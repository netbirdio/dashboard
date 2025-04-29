import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { cn } from "@utils/helpers";
import { cva, VariantProps } from "class-variance-authority";
import React from "react";

export const fancyToggleSwitchVariants = cva([], {
  variants: {
    variant: {
      default: ["px-6 py-4 border rounded-md"],
      blank: null,
    },
    state: {
      true: null,
      false: null,
    },
  },
  compoundVariants: [
    {
      variant: "default",
      state: true,
      className: ["border-gray-300 bg-gray-100 dark:border-nb-gray-800 dark:bg-nb-gray-900/70"],
    },
    {
      variant: "default",
      state: false,
      className: [
        "border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-nb-gray-910 dark:bg-nb-gray-900/30 dark:hover:bg-nb-gray-900/40",
      ],
    },
  ],
});

export type FancyToggleSwitchVariants = VariantProps<
  typeof fancyToggleSwitchVariants
>;

interface Props extends FancyToggleSwitchVariants {
  value: boolean;
  onChange: (value: boolean) => void;
  helpText?: React.ReactNode;
  label?: React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
  dataCy?: string;
  className?: string;
}

export default function FancyToggleSwitch({
  value,
  onChange,
  helpText,
  label,
  children,
  disabled = false,
  dataCy,
  className,
  variant = "default",
}: Readonly<Props>) {
  const handleToggle = () => {
    if (disabled) return;
    onChange(!value);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role={"switch"}
      aria-checked={value}
      className={cn(
        "cursor-pointer transition-all duration-300 relative z-[1]",
        "inline-block text-left w-full",
        disabled && "opacity-50 pointer-events-none",
        fancyToggleSwitchVariants({ variant, state: value }),
        className,
      )}
    >
      <div className={"flex justify-between gap-10"}>
        <div className={"max-w-sm"}>
          <Label>{label}</Label>
          <HelpText margin={false}>{helpText}</HelpText>
        </div>
        <div className={"mt-2 pr-1"}>
          <ToggleSwitch
            checked={value}
            onCheckedChange={onChange}
            dataCy={dataCy}
          />
        </div>
      </div>
      <div>{children && value ? children : null}</div>
    </div>
  );
}
