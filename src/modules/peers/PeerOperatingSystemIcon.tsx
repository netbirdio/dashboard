import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { cn } from "@utils/helpers";
import * as React from "react";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { OSLogo } from "@/modules/peers/PeerOSCell";

type Props = {
  os: string;
  className?: string;
};

export const PeerOperatingSystemIcon = ({ os, className }: Props) => {
  const operatingSystem = getOperatingSystem(os);
  return (
    <div
      className={cn(
        "flex items-center justify-center grayscale brightness-[100%] contrast-[40%]",
        "w-4 h-4 shrink-0",
        operatingSystem === OperatingSystem.WINDOWS && "p-[2.5px]",
        operatingSystem === OperatingSystem.APPLE && "p-[2.7px]",
        operatingSystem === OperatingSystem.FREEBSD && "p-[1.5px]",
        className,
      )}
    >
      <OSLogo os={os} />
    </div>
  );
};
