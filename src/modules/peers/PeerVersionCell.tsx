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
import { ArrowRightIcon, ArrowUpCircleIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";

type Props = {
  version: string;
  os: string;
};
export default function PeerVersionCell({ version, os }: Props) {
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

  return updateAvailable ? (
    <TooltipProvider>
      <Tooltip delayDuration={10}>
        <TooltipTrigger>
          <div className="flex gap-2 items-center interactive-cell">
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
              "flex flex-col gap-1 max-w-[300px] text-xs mt-1"
            }
          >
            A new version of Netbird is available. Please update your client to
            get the latest features and bug fixes.
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
    <div className="inline-flex gap-2 dark:text-neutral-300 text-neutral-500 py-2 px-3 items-center">
      <MemoizedNetBirdIcon />
      {version == "development" ? "dev" : version}
    </div>
  );
}
