import { FlagIcon, GlobeIcon, MapPin, NetworkIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import Skeleton from "react-loading-skeleton";
import { useCountries } from "@/contexts/CountryProvider";
import { Peer } from "@/interfaces/Peer";

type Props = {
  peer: Peer;
};
export const PeerAddressTooltipContent = ({ peer }: Props) => {
  const { isLoading, getRegionByPeer } = useCountries();

  const countryText = useMemo(() => {
    return getRegionByPeer(peer);
  }, [getRegionByPeer, peer]);

  return (
    <div
      className={"text-xs flex flex-col"}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <ListItem
        icon={<MapPin size={14} />}
        label={"NetBird IPv4"}
        value={peer.ip}
      />
      {peer.ip6 != null ? (
        <ListItem
          icon={<MapPin size={14} />}
          label={"NetBird IPv6"}
          value={peer.ip6}
        />
      ) : null}
      <ListItem
        icon={<NetworkIcon size={14} />}
        label={"Public IP"}
        value={peer.connection_ip}
      />
      <ListItem
        icon={<GlobeIcon size={14} />}
        label={"Domain"}
        value={peer.dns_label}
      />
      <ListItem
        icon={<FlagIcon size={14} />}
        label={"Region"}
        value={
          isLoading && !countryText ? <Skeleton width={100} /> : countryText
        }
      />
    </div>
  );
};

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
        "flex justify-between gap-10 border-b border-nb-gray-920 py-2 px-4 last:border-b-0"
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
