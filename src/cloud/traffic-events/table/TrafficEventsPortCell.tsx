import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { CircleHelp, HashIcon, Share2, TagIcon } from "lucide-react";
import * as React from "react";
import {
  getTrafficEventProtocol,
  TrafficEvent,
} from "@/cloud/traffic-events/interfaces/TrafficEvent";
import {
  getICMPCodeDescription,
  getICMPTypeName,
} from "@/cloud/traffic-events/interfaces/TrafficEventICMP";
import {
  getICMPv6CodeDescription,
  getICMPv6TypeName,
} from "@/cloud/traffic-events/interfaces/TrafficEventICMPv6";
import { parseAddressPort } from "@/cloud/traffic-events/utils/parseAddress";

type Props = {
  event: TrafficEvent;
};

export const TrafficEventsPortCell = ({ event }: Props) => {
  const { port: destinationPort } = parseAddressPort(
    event?.destination.address,
  );

  const isICMPv4 = event.protocol === 1;
  const isICMPv6 = event.protocol === 58;
  const isICMP = isICMPv4 || isICMPv6;
  const ICMPType = isICMPv6
    ? getICMPv6TypeName(event.icmp.type)
    : getICMPTypeName(event.icmp.type);
  const ICMPCode = isICMPv6
    ? getICMPv6CodeDescription(event.icmp.type, event.icmp.code)
    : getICMPCodeDescription(event.icmp.type, event.icmp.code);
  const protocolName = getTrafficEventProtocol(event.protocol);

  return (
    <div className={"flex gap-2"}>
      <Badge
        variant={"gray"}
        className={cn("tracking-wider font-medium", !isICMP && "uppercase")}
      >
        <Share2 size={12} />

        {protocolName}
      </Badge>
      {destinationPort && destinationPort !== "0" && (
        <Badge
          variant={"gray"}
          className={"uppercase tracking-wider font-medium"}
        >
          {destinationPort}
        </Badge>
      )}
      {isICMP && (
        <FullTooltip
          delayDuration={250}
          skipDelayDuration={100}
          contentClassName={"p-0"}
          interactive={true}
          content={
            <div
              className={"text-xs flex flex-col"}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <ListItem
                icon={<TagIcon size={14} />}
                label={`Type ${event.icmp.type}`}
                value={ICMPType}
              />
              <ListItem
                icon={<HashIcon size={14} />}
                label={`Code ${event.icmp.code}`}
                value={ICMPCode}
              />
            </div>
          }
        >
          <Badge variant={"gray"} className={"cursor-help"}>
            {ICMPType}
            <CircleHelp
              size={12}
              className={"text-nb-gray-200 relative -top-[0px]"}
            />
          </Badge>
        </FullTooltip>
      )}
    </div>
  );
};

const ListItem = ({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "flex justify-between gap-12 border-b border-nb-gray-920 py-2 px-4 last:border-b-0",
        className,
      )}
    >
      <div className={"flex items-center gap-2 text-nb-gray-100 font-medium"}>
        {icon}
        {label}
      </div>
      <div className={"text-nb-gray-300"}>{value}</div>
    </div>
  );
};
