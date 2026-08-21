import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { cn } from "@utils/helpers";
import {
  BotIcon,
  LucideIcon,
  MonitorSmartphoneIcon,
  ServerIcon,
} from "lucide-react";
import * as React from "react";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { OSLogo } from "@/modules/peers/PeerOSCell";

type Props = {
  os: string;
  className?: string;
};

// Draft placeholder peers have no OS yet — their pseudo-peer carries the
// kind in `os` (see getPlaceholderPeer) and shows the kind's icon.
export const PLACEHOLDER_ICONS: Record<string, LucideIcon> = {
  "draft-agent": BotIcon,
  "draft-server": ServerIcon,
  "draft-user-device": MonitorSmartphoneIcon,
};

export const PeerOperatingSystemIcon = ({ os, className }: Props) => {
  const PlaceholderIcon = PLACEHOLDER_ICONS[os];
  if (PlaceholderIcon) {
    return (
      <div
        className={cn(
          "flex items-center justify-center w-4 h-4 shrink-0",
          className,
        )}
      >
        <PlaceholderIcon size={13} className={"shrink-0"} />
      </div>
    );
  }
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
