import CopyToClipboardText from "@components/CopyToClipboardText";
import { cn } from "@utils/helpers";
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
        label={"NetBird IP"}
        value={
          <CopyToClipboardText
            iconAlignment={"right"}
            message={"NetBird IP has been copied to your clipboard"}
            alwaysShowIcon={true}
          >
            {peer.ip}
          </CopyToClipboardText>
        }
      />
      <ListItem
        icon={<NetworkIcon size={14} />}
        label={"Public IP"}
        value={
          <CopyToClipboardText
            iconAlignment={"right"}
            message={"Public IP has been copied to your clipboard"}
            alwaysShowIcon={true}
          >
            {peer.connection_ip}
          </CopyToClipboardText>
        }
      />
      <ListItem
        icon={<GlobeIcon size={14} />}
        label={"Domain"}
        className={
          peer?.extra_dns_labels && peer.extra_dns_labels.length > 0
            ? "items-start"
            : ""
        }
        value={
          <div className={"text-right flex flex-col gap-[6px]"}>
            <CopyToClipboardText
              iconAlignment={"right"}
              message={"DNS label has been copied to your clipboard"}
              className={"text-right justify-end"}
              alwaysShowIcon={true}
            >
              {peer.dns_label}
            </CopyToClipboardText>

            {peer?.extra_dns_labels?.map((label) => (
              <CopyToClipboardText
                key={label}
                className={"text-right justify-end"}
                iconAlignment={"right"}
                message={"DNS label has been copied to your clipboard"}
                alwaysShowIcon={true}
              >
                {label}
              </CopyToClipboardText>
            ))}
          </div>
        }
      />
      <ListItem
        icon={<FlagIcon size={14} />}
        label={"Region"}
        value={
          isLoading && !countryText ? (
            <Skeleton width={100} />
          ) : (
            <CopyToClipboardText
              iconAlignment={"right"}
              message={"Region has been copied to your clipboard"}
              alwaysShowIcon={true}
            >
              {countryText}
            </CopyToClipboardText>
          )
        }
      />
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
