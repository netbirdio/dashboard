import { cn } from "@utils/helpers";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import * as React from "react";
import { TrafficEventDirection } from "@/cloud/traffic-events/interfaces/TrafficEvent";

interface Props {
  value: TrafficEventDirection;
  onChange: (value: TrafficEventDirection) => void;
}

export function TrafficEventsInboundOutboundFilter({ value, onChange }: Props) {
  const isInbound = value == TrafficEventDirection.INGRESS;
  const isOutbound = value == TrafficEventDirection.EGRESS;

  return (
    <div
      className={cn(
        "bg-nb-gray-930/70 p-1 rounded-lg flex justify-center gap-1 border border-nb-gray-900 relative",
        "group hover:bg-nb-gray-930/80",
      )}
    >
      <InnerButton
        isActive={isInbound}
        onClick={() => onChange(TrafficEventDirection.INGRESS)}
      >
        <ArrowDownIcon size={14} className={cn("text-sky-400")} />
        Inbound
      </InnerButton>
      <InnerButton
        isActive={isOutbound}
        onClick={() => onChange(TrafficEventDirection.EGRESS)}
      >
        <ArrowUpIcon size={14} className={cn("text-netbird")} />
        Outbound
      </InnerButton>
    </div>
  );
}

type InnerButtonProps = {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

const InnerButton = ({ isActive, onClick, children }: InnerButtonProps) => {
  return (
    <button
      className={cn(
        "px-3 py-1.5 text-sm rounded-md w-full transition-all data-[disabled]:opacity-10",
        isActive && "bg-nb-gray-900",
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "flex items-center w-full justify-center gap-1.5",
          !isActive ? "text-nb-gray-300" : "text-nb-gray-200",
        )}
      >
        {children}
      </div>
    </button>
  );
};
