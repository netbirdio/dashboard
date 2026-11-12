import FancyToggleSwitch from "@components/FancyToggleSwitch";
import FullTooltip from "@components/FullTooltip";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import Separator from "@components/Separator";
import { IconInfoCircle } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { HourglassIcon } from "lucide-react";

export const DEFAULT_STALE_GRACE = 30;
const MAX_STALE_GRACE = 240;

export const isValidStaleGrace = (enabled: boolean, value: string) => {
  if (!enabled) return true;
  const minutes = Number(value);
  return (
    Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_STALE_GRACE
  );
};

type Props = {
  name: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export const EDRStaleGraceInput = ({
  name,
  enabled,
  onEnabledChange,
  value,
  onChange,
  className,
}: Props) => (
  <div className={cn("flex flex-col gap-6", className)}>
    <Separator />
    <FancyToggleSwitch
      variant={"blank"}
      value={enabled}
      onChange={onEnabledChange}
      label={
        <>
          <HourglassIcon size={14} />
          Grace Period
        </>
      }
      helpText={
        <>
          Keep approved devices connected after a long absence, until they check
          in with {name} again.
        </>
      }
    >
      <div className={"flex flex-row gap-3 w-full justify-between"}>
        <div>
          <Label htmlFor={"stale-grace"}>Duration</Label>
          <FullTooltip
            interactive={false}
            content={
              <div className={"max-w-xs text-xs"}>
                Example: This property is set to {DEFAULT_STALE_GRACE} minutes.
                Jane&apos;s laptop was off for a week, so its last check-in in{" "}
                {name} is too old. It keeps network access for up to{" "}
                {DEFAULT_STALE_GRACE} minutes after it comes back online, while
                it checks in with {name} again.
              </div>
            }
          >
            <HelpText className={"max-w-sm mt-1"}>
              How long a returning device keeps network{" "}
              <span className={"whitespace-nowrap"}>
                access.
                <IconInfoCircle
                  size={14}
                  className={"relative inline ml-1 -top-[1px]"}
                />
              </span>
            </HelpText>
          </FullTooltip>
        </div>

        <Input
          id={"stale-grace"}
          placeholder={DEFAULT_STALE_GRACE.toString()}
          min={1}
          max={MAX_STALE_GRACE}
          className={"w-full min-w-[130px] ml-auto"}
          value={value}
          type={"number"}
          error={
            isValidStaleGrace(enabled, value)
              ? undefined
              : `Must be a whole number between 1 and ${MAX_STALE_GRACE}`
          }
          errorTooltip={true}
          onChange={(e) => onChange(e.target.value)}
          customSuffix={"Minutes"}
        />
      </div>
    </FancyToggleSwitch>
  </div>
);
