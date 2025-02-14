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
      className: ["border-nb-gray-800 bg-nb-gray-900/70"],
    },
    {
      variant: "default",
      state: false,
      className: [
        "border-nb-gray-910 bg-nb-gray-900/30 hover:bg-nb-gray-900/40",
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
  return (
    <button
      onClick={() => {
        if (disabled) return;
        onChange(!value);
      }}
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
    </button>
  );
}
