import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import MemoizedNetBirdIcon from "@components/ui/MemoizedNetBirdIcon";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { parseVersionString } from "@utils/version";
import { trim } from "lodash";
import { ArrowRightIcon, ArrowUpCircleIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { PeerOperatingSystemIcon } from "@/modules/peers/PeerOperatingSystemIcon";

type Props = {
  version: string;
  os: string;
  serial?: string;
};
export default function PeerVersionCell({ version, os, serial }: Props) {
  const { latestVersion, latestUrl } = useApplicationContext();

  const updateAvailable = useMemo(() => {
    const operatingSystem = getOperatingSystem(os);
    if (
      operatingSystem === OperatingSystem.IOS ||
      operatingSystem === OperatingSystem.ANDROID
    )
      return false;
    return parseVersionString(version) < parseVersionString(latestVersion);
  }, [os, version, latestVersion]);

  const updateIcon = useMemo(() => {
    return <ArrowUpCircleIcon size={15} className={"text-netbird"} />;
  }, []);

  const isWasmClient = trim(os) === "js";

  return (
    <div className={"flex flex-col gap-1"}>
      {updateAvailable ? (
        <TooltipProvider>
          <Tooltip delayDuration={10}>
            <TooltipTrigger>
              <div className="flex gap-2 dark:text-neutral-300 text-neutral-500 hover:text-neutral-100 transition-all rounded-md items-center">
                <MemoizedNetBirdIcon />
                {version == "development" ? "dev" : version}
                <div className={"relative"}>
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
        <div className="inline-flex gap-2 dark:text-neutral-300 text-neutral-500 items-center">
          <MemoizedNetBirdIcon />
          {version == "development" ? "dev" : version}
        </div>
      )}

      {os && os !== "" && os !== " " && (
        <FullTooltip
          delayDuration={500}
          disabled={!serial || serial === ""}
          content={
            <div className={"text-xs"}>
              <span className={"text-nb-gray-100 font-medium"}>Serial: </span>
              {serial}
            </div>
          }
        >
          <div
            className={
              "flex items-center gap-2 text-neutral-300 whitespace-nowrap"
            }
          >
            <PeerOperatingSystemIcon os={os} />

            {isWasmClient ? "Web Client" : os}
          </div>
        </FullTooltip>
      )}
    </div>
  );
}
