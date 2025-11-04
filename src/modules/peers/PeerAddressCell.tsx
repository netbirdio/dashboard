import CopyToClipboardText from "@components/CopyToClipboardText";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { isEmpty } from "lodash";
import { GlobeIcon } from "lucide-react";
import React from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import { Peer } from "@/interfaces/Peer";
import { PeerAddressTooltipContent } from "@/modules/peers/PeerAddressTooltipContent";

type Props = {
  peer: Peer;
};
export default function PeerAddressCell({ peer }: Props) {
  return (
    <FullTooltip
      side={"top"}
      interactive={true}
      delayDuration={250}
      skipDelayDuration={100}
      contentClassName={"p-0"}
      content={<PeerAddressTooltipContent peer={peer} />}
    >
      <div
        className={
          "flex gap-2.5 items-center min-w-[300px] max-w-[300px] group/cell transition-all hover:bg-nb-gray-800/10 py-2 px-3 rounded-md cursor-default"
        }
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full h-3 w-3 shrink-0 relative -top-[0.5rem]",
          )}
        >
          {isEmpty(peer.country_code) ? (
            <GlobeIcon size={16} className={"text-nb-gray-300"} />
          ) : (
            <RoundedFlag country={peer.country_code} size={12} />
          )}
        </div>
        <div className="flex flex-col gap-0 dark:text-neutral-300 text-neutral-500 font-light truncate">
          <CopyToClipboardText
            message={"DNS label has been copied to your clipboard"}
          >
            <span className={"font-normal truncate"}>{peer.dns_label}</span>
          </CopyToClipboardText>
          <CopyToClipboardText
            message={"IP address has been copied to your clipboard"}
          >
            <span
              className={"dark:text-nb-gray-400 font-mono font-thin text-xs"}
            >
              {peer.ip}
            </span>
          </CopyToClipboardText>
        </div>
      </div>
    </FullTooltip>
  );
}
