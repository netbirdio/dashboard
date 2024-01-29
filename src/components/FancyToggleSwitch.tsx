import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { cn } from "@utils/helpers";
import React from "react";

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
  helpText?: React.ReactNode;
  label?: React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
};
export default function FancyToggleSwitch({
  value,
  onChange,
  helpText,
  label,
  children,
  disabled = false,
}: Props) {
  return (
    <div
      onClick={() => {
        if (disabled) return;
        onChange(!value);
      }}
      className={cn(
        "px-5 py-3.5 border rounded-md cursor-pointer transition-all duration-300 relative z-[1]",
        value
          ? "border-nb-gray-800 bg-nb-gray-900/70"
          : "border-nb-gray-800 bg-nb-gray-900/30 hover:bg-nb-gray-900/40",
        disabled && "opacity-30 pointer-events-none",
      )}
    >
      <div className={"flex justify-between gap-10  "}>
        <div className={"max-w-sm"}>
          <Label>{label}</Label>
          <HelpText margin={false}>{helpText}</HelpText>
        </div>
        <div className={"mt-2"}>
          <ToggleSwitch checked={value} onCheckedChange={onChange} />
        </div>
      </div>
      <div>{children && value ? children : null}</div>
    </div>
  );
}
