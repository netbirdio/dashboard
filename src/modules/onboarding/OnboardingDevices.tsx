import TruncatedText from "@components/ui/TruncatedText";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { cn } from "@utils/helpers";
import {
  GlobeIcon,
  NetworkIcon,
  ShieldCheckIcon,
  ShieldXIcon,
  WorkflowIcon,
} from "lucide-react";
import * as React from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import { NetworkResource } from "@/interfaces/Network";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import type { Peer } from "@/interfaces/Peer";
import { Intent } from "@/modules/onboarding/Onboarding";
import { OSLogo } from "@/modules/peers/PeerOSCell";

type Props = {
  intent?: Intent;
  resource?: NetworkResource;
  firstDevice?: Peer;
  secondDevice?: Peer;
  firstRoutingPeer?: Peer;
  enabled?: boolean;
};

export const OnboardingDevices = ({
  intent,
  resource,
  firstDevice,
  secondDevice,
  firstRoutingPeer,
  enabled = false,
}: Props) => {
  return intent === Intent.P2P ? (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center text-center text-nb-gray-300 py-8 w-full relative",
        !firstDevice && !secondDevice ? "gap-y-8" : "gap-y-2",
      )}
    >
      <DeviceCard device={firstDevice} />
      {firstDevice && secondDevice && (
        <div
          className={cn(
            "h-[70px] w-[2px] rounded-full border-l border-dashed border-green-400 relative",
            !enabled && "border-nb-gray-600",
          )}
        ></div>
      )}

      {firstDevice && secondDevice && (
        <div
          className={
            "absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-nb-gray-940 p-2 "
          }
        >
          {enabled ? (
            <ShieldCheckIcon size={16} className={"text-green-500"} />
          ) : (
            <ShieldXIcon size={16} className={"text-red-500"} />
          )}
        </div>
      )}

      <DeviceCard device={secondDevice} />
      {(!firstDevice || !secondDevice) && (
        <WaitingForDevice
          text={
            !firstDevice
              ? "Waiting for your first device to connect"
              : "Waiting for your second device to connect"
          }
        />
      )}
    </div>
  ) : (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center text-center text-nb-gray-300 w-full",
        "gap-y-2",
        firstRoutingPeer && "h-full",
      )}
    >
      {firstRoutingPeer && resource && (
        <span className={"text-xs text-nb-gray-500"}>Network</span>
      )}

      <div
        className={cn(
          "flex flex-col items-center justify-center gap-y-1",
          resource &&
            firstRoutingPeer &&
            "border px-4 py-5 bg-nb-gray-940 border-nb-gray-900  rounded-lg border-dashed",
        )}
      >
        <DeviceCard resource={resource} />
        {resource && (
          <Line
            className={cn(
              firstRoutingPeer && firstDevice && enabled
                ? "bg-green-400 animate-bg-scroll-faster"
                : "bg-nb-gray-600",
            )}
            height={"30px"}
            bg={"#1c1d21"}
            config={["4px", "4px", "8px", "7.5px"]}
          />
        )}
        <DeviceCard device={firstRoutingPeer} />
      </div>

      <div className={"flex flex-col items-center justify-center relative"}>
        {firstRoutingPeer && (
          <Line
            className={cn(
              firstRoutingPeer && firstDevice && enabled
                ? "bg-green-400 animate-bg-scroll"
                : "bg-nb-gray-600",
            )}
            height={firstDevice && firstRoutingPeer ? "65px" : "25px"}
            bg={"#1c1d21"}
          />
        )}
        <DeviceCard device={firstDevice} />
        {(!firstDevice || !firstRoutingPeer) && (
          <WaitingForDevice
            text={
              !firstRoutingPeer
                ? "Waiting for your routing peer to connect"
                : "Waiting for your own device to connect"
            }
          />
        )}
        {firstDevice && firstRoutingPeer && (
          <div
            className={
              "absolute top-0 left-1/2 -translate-x-1/2 bg-nb-gray-940 p-1 mt-[20px]"
            }
          >
            {enabled ? (
              <ShieldCheckIcon size={16} className={"text-green-500"} />
            ) : (
              <ShieldXIcon size={16} className={"text-red-500"} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const WaitingForDevice = ({
  text = "Waiting for your first device to connect",
}: {
  text: string;
}) => {
  return (
    <div className={"flex flex-col items-center justify-center mt-3"}>
      <div className="relative h-10 w-10 mt-4">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-10 w-10 rounded-full bg-netbird/10 border border-netbird/60 animate-slow-ping "></div>
        </div>
        <div className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-netbird z-10" />
      </div>
      <div className="text-sm font-light animate-slow-pulse mt-6">{text}</div>
    </div>
  );
};

type DeviceCardProps = {
  device?: Peer;
  resource?: NetworkResource;
};

export const DeviceCard = ({ device, resource }: DeviceCardProps) => {
  if (!device && !resource) return;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2.5 text-nb-gray-300 text-left py-1 pl-3 pr-4 rounded-md group/machine my-0 w-[200px]",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-md h-9 w-9 shrink-0 bg-nb-gray-900 transition-all",
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

const Line = ({
  className,
  height = "100%",
  bg = "#1c1d21",
  config = ["2px", "3px", "6px", "8.2px"],
}: {
  className?: string;
  height?: string;
  bg?: string;
  config?: string[];
}) => {
  return (
    <div
      className={cn(
        className,
        "w-[1px] overflow-hidden relative -left-[0.5px]",
      )}
      style={{
        height: height,
      }}
    >
      <div
        className={cn("absolute inset-0 w-full", className)}
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0%, transparent ${config?.[0]}, ${bg} ${config?.[1]}, ${bg} ${config?.[2]})`,
          backgroundSize: `100% ${config?.[3]}`,
        }}
      />
    </div>
  );
};
