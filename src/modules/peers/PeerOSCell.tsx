import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import Image from "next/image";
import React, { useMemo } from "react";
import { FaWindows } from "react-icons/fa6";
import { FcAndroidOs, FcLinux } from "react-icons/fc";
import IOSIcon from "@/assets/icons/IOSIcon";
import AppleLogo from "@/assets/os-icons/apple.svg";
import { getOperatingSystem } from "@/hooks/useOperatingSystem";
import { OperatingSystem } from "@/interfaces/OperatingSystem";

export function PeerOSCell({ os }: { os: string }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={1}>
        <TooltipTrigger>
          <div
            className={
              "flex items-center gap-2 dark:text-neutral-300 text-neutral-500 hover:text-neutral-100 transition-all hover:bg-nb-gray-800/60 py-2 px-3 rounded-md"
            }
          >
            <div
              className={
                "h-6 w-6 flex items-center justify-center grayscale brightness-[100%] contrast-[40%]"
              }
            >
              <OSLogo os={os} />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className={"text-neutral-300 flex flex-col gap-1"}>{os}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function OSLogo({ os }: { os: string }) {
  const icon = useMemo(() => {
    return getOperatingSystem(os.toLowerCase());
  }, [os]);

  if (icon === OperatingSystem.WINDOWS)
    return <FaWindows className={"text-white text-lg"} />;
  if (icon === OperatingSystem.APPLE)
    return <Image src={AppleLogo} alt={""} width={14} />;
  if (icon === OperatingSystem.IOS)
    return <Image src={AppleLogo} alt={""} width={14} />;
  if (icon === OperatingSystem.ANDROID)
    return <FcAndroidOs className={"text-white text-2xl brightness-200"} />;

  return <FcLinux className={"text-white text-2xl brightness-150"} />;
}
