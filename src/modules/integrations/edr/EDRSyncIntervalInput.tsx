import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { cn } from "@utils/helpers";
import { TimerIcon } from "lucide-react";

export const DEFAULT_SYNC_INTERVAL = 1;
const MAX_SYNC_INTERVAL = 1440;

export const isValidSyncInterval = (value: string) => {
  const minutes = Number(value);
  return (
    Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_SYNC_INTERVAL
  );
};

type Props = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export const EDRSyncIntervalInput = ({
  name,
  value,
  onChange,
  className,
}: Props) => (
  <div className={cn("flex flex-row gap-3 w-full justify-between", className)}>
    <div>
      <Label>
        <div className={"flex gap-2 items-center"}>
          <TimerIcon size={14} />
          Sync Interval
        </div>
      </Label>
      <HelpText className={"max-w-sm mt-1"}>
        How often devices are synced from {name}.
      </HelpText>
    </div>

    <Input
      placeholder={DEFAULT_SYNC_INTERVAL.toString()}
      min={1}
      max={MAX_SYNC_INTERVAL}
      className={"w-full min-w-[130px] ml-auto"}
      value={value}
      type={"number"}
      error={
        isValidSyncInterval(value)
          ? undefined
          : `Must be between 1 and ${MAX_SYNC_INTERVAL}`
      }
      errorTooltip={true}
      onChange={(e) => onChange(e.target.value)}
      customSuffix={"Minutes"}
    />
  </div>
);
