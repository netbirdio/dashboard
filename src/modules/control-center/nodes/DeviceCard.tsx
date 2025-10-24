import TruncatedText from "@components/ui/TruncatedText";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { cn } from "@utils/helpers";
import { GlobeIcon, NetworkIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import { NetworkResource } from "@/interfaces/Network";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import type { Peer } from "@/interfaces/Peer";
import { OSLogo } from "@/modules/peers/PeerOSCell";

type DeviceCardProps = {
  device?: Peer;
  resource?: NetworkResource;
  className?: string;
};

export const DeviceCard = ({
  device,
  resource,
  className,
}: DeviceCardProps) => {
  if (!device && !resource) return;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2.5 text-nb-gray-300 text-left py-1 pl-3 pr-4 rounded-md group/machine my-0 w-[200px]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-md h-9 w-9 shrink-0 bg-nb-gray-850 transition-all",
          "group-hover:bg-nb-gray-800 relative",
        )}
      >
        {device && <PeerOSIcon os={device.os} />}
        {resource?.type && <ResourceIcon type={resource.type} />}

        {device?.country_code && (
          <div className={"absolute -bottom-[4px] -right-[4px]"}>
            <div
              className={cn(
                "flex items-center justify-center rounded-full border-[3px] shrink-0",
                "border-nb-gray-940",
              )}
            >
              <RoundedFlag country={device?.country_code} size={10} />
            </div>
          </div>
        )}
      </div>
      <div className={"flex flex-col gap-0 justify-center mt-2 leading-tight"}>
        <span
          className={
            "mb-1.5 font-normal text-[0.85rem] text-nb-gray-100 flex items-center gap-2"
          }
        >
          <TruncatedText
            text={device?.name || resource?.name || "Unknown"}
            maxWidth={"150px"}
            hideTooltip={true}
          />
        </span>
        <span
          className={
            "text-sm font-normal text-nb-gray-400 -top-[0.3rem] relative"
          }
        >
          {device?.ip || resource?.address}
        </span>
      </div>
    </div>
  );
};

const PeerOSIcon = ({ os }: { os: string }) => {
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
