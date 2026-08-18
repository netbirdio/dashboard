import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import { Barcode, CpuIcon } from "lucide-react";
import Image from "next/image";
import React, { useMemo } from "react";
import { FaWindows } from "react-icons/fa6";
import { FcAndroidOs, FcLinux } from "react-icons/fc";
import IOSIcon from "@/assets/icons/IOSIcon";
import AppleLogo from "@/assets/os-icons/apple.svg";
import FreeBSDLogo from "@/assets/os-icons/FreeBSD.png";
import { getOperatingSystem } from "@/hooks/useOperatingSystem";
import { OperatingSystem } from "@/interfaces/OperatingSystem";

type Props = {
  os: string;
  serial?: string;
};
export function PeerOSCell({ os, serial }: Readonly<Props>) {
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
        <TooltipContent className={"!p-0"}>
          <div>
            <ListItem icon={<CpuIcon size={14} />} label={"OS"} value={os} />
            {serial && serial !== "" && (
              <ListItem
                icon={<Barcode size={14} />}
                label={"Serial Number"}
                value={serial}
              />
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const ListItem = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
}) => {
  return (
    <div
      className={
        "flex justify-between gap-5 border-b border-nb-gray-920 py-2 px-4 last:border-b-0 text-xs"
      }
    >
      <div className={"flex items-center gap-2 text-nb-gray-100 font-medium"}>
        {icon}
        {label}
      </div>
      <div className={"text-nb-gray-400"}>{value}</div>
    </div>
  );
};

// `size` is the base measure (defaults keep the historical look); each logo
// scales from it with its own factor because the marks aren't optically equal
// at the same pixel size.
export function OSLogo({ os, size = 18 }: { os: string; size?: number }) {
  const icon = useMemo(() => {
    return getOperatingSystem(os);
  }, [os]);

  if (icon === OperatingSystem.WINDOWS)
    return <FaWindows className={"text-white"} size={size} />;
  if (icon === OperatingSystem.APPLE)
    return (
      <Image src={AppleLogo} alt={""} width={Math.round(size * (14 / 18))} />
    );
  if (icon === OperatingSystem.FREEBSD)
    return <Image src={FreeBSDLogo} alt={""} width={size} />;
  if (icon === OperatingSystem.IOS)
    return (
      <IOSIcon className={"fill-white"} size={Math.round(size * (20 / 18))} />
    );
  if (icon === OperatingSystem.ANDROID)
    return (
      <FcAndroidOs
        className={"text-white brightness-200"}
        size={Math.round(size * (24 / 18))}
      />
    );

  return (
    <FcLinux
      className={"text-white brightness-150"}
      size={Math.round(size * (24 / 18))}
    />
  );
}
