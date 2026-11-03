import InlineLink from "@components/InlineLink";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import MemoizedNetBirdIcon from "@components/ui/MemoizedNetBirdIcon";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { useOverflowTooltip } from "@hooks/useOverflowTooltip";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { compareVersions } from "@utils/version";
import { ArrowRightIcon, ArrowUpCircleIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { PeerOperatingSystemIcon } from "@/modules/peers/PeerOperatingSystemIcon";
import FullTooltip from "@components/FullTooltip";

type Props = {
  version: string;
  os: string;
  serial?: string;
  ephemeral?: boolean;
};
export default function PeerVersionCell({
  version,
  os,
  serial,
  ephemeral,
}: Props) {
  const { latestVersion, latestUrl } = useApplicationContext();

  const updateAvailable = useMemo(() => {
    if (ephemeral) return false;
    const operatingSystem = getOperatingSystem(os);
    if (
      operatingSystem === OperatingSystem.IOS ||
      operatingSystem === OperatingSystem.ANDROID
    )
      return false;
    if (!latestVersion) return false;
    return !compareVersions(version, latestVersion);
  }, [os, version, latestVersion, ephemeral]);

  const displayVersion = version == "development" ? "dev" : version;
  const hasSerial = !!serial && serial !== "";
  const {
    ref: osRef,
    open: osTooltipOpen,
    isOverflowing: isOsTruncated,
    onOpenChange: onOsTooltipOpenChange,
  } = useOverflowTooltip<HTMLSpanElement>(hasSerial);

  const updateIcon = useMemo(() => {
    return <ArrowUpCircleIcon size={15} className={"text-netbird"} />;
  }, []);

  return (
    <div className={"flex flex-col gap-1 min-w-0"}>
      {updateAvailable ? (
        <TooltipProvider>
          <Tooltip delayDuration={10}>
            <TooltipTrigger className={"flex max-w-full min-w-0"}>
              <div className="flex gap-2 dark:text-neutral-300 text-neutral-500 hover:text-neutral-100 transition-all rounded-md items-center min-w-0">
                <MemoizedNetBirdIcon />
                {/* The update tooltip shows the full version. */}
                <span className={"truncate"}>{displayVersion}</span>
                <div className={"relative shrink-0"}>
                  <span className="animate-ping absolute left-0 inline-flex h-[15px] w-[15px] rounded-full bg-netbird opacity-20"></span>
                  {updateIcon}
                </div>
              </div>
            </TooltipTrigger>

            <TooltipContent>
              <div
                className={
                  " inline-flex gap-2 items-center rounded-md text-xs my-2"
                }
              >
                <MemoizedNetBirdIcon />
                <span>{version}</span>
                <ArrowRightIcon size={16} className={"text-netbird"} />
                <span className={"text-netbird"}>{latestVersion}</span>
              </div>
              <p className={"font-medium"}>Update available </p>

              <div
                className={
                  "text-neutral-300 flex flex-col gap-1 max-w-[300px] text-xs mt-1"
                }
              >
                A new version of Netbird is available. Please update your client
                to get the latest features and bug fixes.
              </div>
              <InlineLink
                onClick={(e) => e.stopPropagation()}
                href={latestUrl as string}
                target={"_blank"}
                className={"mt-2 mb-2 text-xs"}
              >
                Download & Changelog
              </InlineLink>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <div className="flex gap-2 dark:text-neutral-300 text-neutral-500 items-center min-w-0">
          <MemoizedNetBirdIcon />
          <TextWithTooltip text={displayVersion} fluid={true} />
        </div>
      )}

      {os && os !== "" && os !== " " && (
        <FullTooltip
          delayDuration={500}
          customOpen={osTooltipOpen}
          customOnOpenChange={onOsTooltipOpenChange}
          className={"flex w-full min-w-0"}
          content={
            <div className={"text-xs"}>
              {isOsTruncated && <div className={"text-nb-gray-100"}>{os}</div>}
              {hasSerial && (
                <div>
                  <span className={"text-nb-gray-100 font-medium"}>
                    Serial:{" "}
                  </span>
                  {serial}
                </div>
              )}
            </div>
          }
        >
          <div
            className={
              "flex items-center gap-2 text-neutral-300 whitespace-nowrap min-w-0"
            }
          >
            <span className={"shrink-0"}>
              <PeerOperatingSystemIcon os={os} />
            </span>
            <span ref={osRef} className={"truncate"}>
              {os}
            </span>
          </div>
        </FullTooltip>
      )}
    </div>
  );
}
