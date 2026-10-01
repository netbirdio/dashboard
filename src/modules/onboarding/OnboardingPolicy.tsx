import { ToggleSwitch } from "@components/ToggleSwitch";
import { cn } from "@utils/helpers";
import { ShieldIcon } from "lucide-react";
import * as React from "react";
import { Policy } from "@/interfaces/Policy";

type Props = {
  policy?: Policy;
  onToggle?: (policy: Policy) => void;
};

export const OnboardingPolicy = ({ policy, onToggle }: Props) => {
  if (!policy) return;

  return (
    <label
      className={cn(
        "relative block rounded-lg border border-nb-gray-900 px-5 py-3 transition-all",
        "flex justify-between items-center mt-3 cursor-pointer",
      )}
    >
      <div>
        <div className="text-nb-gray-100 font-normal text-sm text-left gap-2 flex items-center">
          <ShieldIcon size={12} className={"shrink-0"} />
          {policy?.name} Policy
        </div>
        <div className={"text-nb-gray-300 text-[0.8rem] text-left mt-0.5"}>
          {policy?.name.includes("Default")
            ? "Allows connections between all your devices"
            : policy?.description}
        </div>
      </div>
      <ToggleSwitch
        onCheckedChange={() => onToggle?.(policy)}
        checked={policy?.enabled || false}
      />
    </label>
  );
};
