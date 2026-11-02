import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { cn } from "@utils/helpers";
import { ArrowUpWideNarrowIcon } from "lucide-react";
import * as React from "react";

type Props = {
  enabled: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};
export const CrowdStrikeZtaScoreInput = ({
  enabled,
  value,
  onChange,
  error,
}: Props) => {
  return (
    <div
      className={cn(
        "flex justify-between mt-6 gap-5",
        !enabled && "opacity-30 pointer-events-none",
      )}
    >
      <div>
        <Label>Score Threshold</Label>
        <HelpText>
          {
            "If the peer's ZTA score is below the threshold, the peer will be rejected. The score should be between 1 and 100."
          }
        </HelpText>
      </div>
      <Input
        maxWidthClass={"max-w-[200px] min-w-[120px]"}
        placeholder={"80"}
        min={0}
        max={100}
        errorTooltip={true}
        error={error}
        value={value}
        type={"number"}
        onChange={(e) => onChange(e.target.value)}
        customPrefix={
          <ArrowUpWideNarrowIcon size={16} className={"text-nb-gray-300"} />
        }
      />
    </div>
  );
};
