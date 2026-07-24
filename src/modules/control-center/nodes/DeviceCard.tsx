import TruncatedText from "@components/ui/TruncatedText";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { cn } from "@utils/helpers";
import {
  BotIcon,
  GlobeIcon,
  LucideIcon,
  MonitorSmartphoneIcon,
  NetworkIcon,
  ServerIcon,
  WorkflowIcon,
} from "lucide-react";
import * as React from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import { NetworkResource } from "@/interfaces/Network";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import type { Peer } from "@/interfaces/Peer";
import { OSLogo } from "@/modules/peers/PeerOSCell";

type DeviceCardSize = "default" | "small";

type DeviceCardProps = {
  device?: Peer;
  resource?: NetworkResource;
  className?: string;
  size?: DeviceCardSize;
  // Rendered inline after the name (e.g. the NEW badge for draft entities).
  badge?: React.ReactNode;
  // Truncation width for the name — wider containers (e.g. the group panel
  // lists) pass more room than the canvas-card default.
  nameMaxWidth?: string;
};

export const DeviceCard = ({
  device,
  resource,
  className,
  size = "default",
  badge,
  nameMaxWidth,
}: DeviceCardProps) => {
  if (!device && !resource) return;

  const isSmall = size === "small";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center text-nb-gray-300 text-left rounded-md group/machine my-0",
        isSmall
          ? "gap-2 py-0.5 pl-2 pr-3 w-auto"
          : "gap-2.5 py-1 pl-3 pr-4 w-[200px]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-md shrink-0 bg-nb-gray-850 transition-all",
          "group-hover:bg-nb-gray-800 relative",
          isSmall ? "h-8 w-8" : "h-9 w-9",
        )}
      >
        {device && <PeerOSIcon os={device.os} size={isSmall ? 14 : 16} />}
        {resource && (
          // Type-less draft resources (no address yet) get the default icon.
          <ResourceIcon
            type={resource.type ?? "host"}
            size={isSmall ? 14 : 15}
          />
        )}

        {device?.country_code && (
          <div className={"absolute -bottom-[4px] -right-[4px]"}>
            <div
              className={cn(
                "flex items-center justify-center rounded-full shrink-0",
                isSmall
                  ? "border-[2px] border-nb-gray-940"
                  : "border-[3px] border-nb-gray-940",
              )}
            >
              <RoundedFlag
                country={device?.country_code}
                size={isSmall ? 8 : 10}
              />
            </div>
          </div>
        )}
      </div>
      <div
        className={cn(
          "flex flex-col justify-center leading-tight",
          // Peer subtitles sit tighter than resource ones — a hair less gap
          // keeps resources from looking spaced out.
          device ? "gap-0.5" : "gap-px",
        )}
      >
        <span
          className={cn(
            "font-normal text-nb-gray-100 flex items-center gap-2",
            isSmall ? "text-xs" : "mb-1.5 text-[0.85rem] mt-2",
          )}
        >
          <TruncatedText
            text={device?.name || resource?.name || "Unknown"}
            maxWidth={nameMaxWidth ?? (isSmall ? "120px" : "150px")}
            hideTooltip={true}
          />
          {badge}
        </span>
        <span
          className={cn(
            "font-normal text-nb-gray-400 relative",
            isSmall
              ? "text-[0.7rem]"
              : "text-sm -top-[0.3rem]",
          )}
        >
          {device?.ip || resource?.address}
        </span>
      </div>
    </div>
  );
};

// Draft placeholder peers carry their kind in `os` (see getPlaceholderPeer).
const DRAFT_KIND_ICONS: Record<string, LucideIcon> = {
  "draft-agent": BotIcon,
  "draft-server": ServerIcon,
  "draft-user-device": MonitorSmartphoneIcon,
};

const PeerOSIcon = ({ os, size = 16 }: { os: string; size?: number }) => {
  const DraftIcon = DRAFT_KIND_ICONS[os];
  if (DraftIcon) {
    return (
      <div
        className={"flex items-center justify-center shrink-0"}
        style={{ width: size, height: size }}
      >
        <DraftIcon size={size} />
      </div>
    );
  }
  const osType = getOperatingSystem(os);
  return (
    <div
      className={cn(
        "flex items-center justify-center grayscale brightness-[100%] contrast-[40%]",
        "shrink-0",
        osType === OperatingSystem.WINDOWS && "p-[2.5px]",
        osType === OperatingSystem.APPLE && "p-[2.7px]",
        osType === OperatingSystem.FREEBSD && "p-[1.5px]",
      )}
      style={{ width: size, height: size }}
    >
      <OSLogo os={os} />
    </div>
  );
};

const ResourceIcon = ({
  type,
  size = 15,
}: {
  type: "domain" | "host" | "subnet";
  size?: number;
}) => {
  switch (type) {
    case "domain":
      return <GlobeIcon size={size} />;
    case "subnet":
      return <NetworkIcon size={size} />;
    case "host":
      return <WorkflowIcon size={size} />;
    default:
      return <WorkflowIcon size={size} />;
  }
};
