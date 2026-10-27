import FullTooltip from "@components/FullTooltip";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import Separator from "@components/Separator";
import { IconInfoCircle } from "@tabler/icons-react";
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
  <div className={cn("flex flex-col gap-6", className)}>
    <Separator />
    <div className={"flex flex-row gap-3 w-full justify-between"}>
      <div>
        <Label htmlFor={"sync-interval"}>
          <div className={"flex gap-2 items-center"}>
            <TimerIcon size={14} />
            Sync Frequency
          </div>
        </Label>
        <FullTooltip
          interactive={false}
          content={
            <div className={"max-w-xs text-xs"}>
              Example: This property is set to 1 minute. If Jane&apos;s laptop
              stops meeting the requirements in {name}, NetBird picks up the
              change on its next check, within 1 minute, and blocks network
              access.
            </div>
          }
        >
          <HelpText className={"max-w-sm mt-1"}>
            How often NetBird checks {name} for device status{" "}
            <span className={"whitespace-nowrap"}>
              changes.
              <IconInfoCircle
                size={14}
                className={"relative inline ml-1 -top-[1px]"}
              />
            </span>
          </HelpText>
        </FullTooltip>
      </div>

      <Input
        id={"sync-interval"}
        placeholder={DEFAULT_SYNC_INTERVAL.toString()}
        min={1}
        max={MAX_SYNC_INTERVAL}
        className={"w-full min-w-[130px] ml-auto"}
        value={value}
        type={"number"}
        error={
          isValidSyncInterval(value)
            ? undefined
            : `Must be a whole number between 1 and ${MAX_SYNC_INTERVAL}`
        }
        errorTooltip={true}
        onChange={(e) => onChange(e.target.value)}
        customSuffix={"Minutes"}
      />
    </div>
  </div>
);
