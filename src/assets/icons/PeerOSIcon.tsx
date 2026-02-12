import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { cn } from "@utils/helpers";
import * as React from "react";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { OSLogo } from "@/modules/peers/PeerOSCell";

type Props = {
  os: string;
};

export const PeerOSIcon = ({ os }: Props) => {
  const osType = getOperatingSystem(os);
  return (
    <div
      className={cn(
        "flex items-center justify-center grayscale brightness-[100%] contrast-[40%]",
        "w-4 h-4 shrink-0",
        osType === OperatingSystem.WINDOWS && "p-[2.5px]",
        osType === OperatingSystem.APPLE && "p-[2.7px]",
        osType === OperatingSystem.FREEBSD && "p-[1.5px]",
      )}
    >
      <OSLogo os={os} />
    </div>
  );
};
