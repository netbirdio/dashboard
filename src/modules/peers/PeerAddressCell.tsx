import CopyToClipboardText from "@components/CopyToClipboardText";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn } from "@utils/helpers";
import { GlobeIcon } from "lucide-react";
import { Peer } from "@/interfaces/Peer";

type Props = {
  peer: Peer;
};
export default function PeerAddressCell({ peer }: Props) {
  return (
    <div className={"flex gap-4 items-center min-w-[320px] max-w-[320px]"}>
      <div
        className={cn(
          "flex items-center justify-center rounded-md h-8 w-8 shrink-0",
          peer.connected ? "bg-green-600" : "bg-nb-gray-800 opacity-50",
        )}
      >
        <GlobeIcon size={14} className={"shrink-0"} />
      </div>
      <div className="flex flex-col gap-0 dark:text-neutral-300 text-neutral-500 font-light">
        <CopyToClipboardText
          message={"DNS label has been copied to your clipboard"}
        >
          <span className={"font-normal"}>
            <TextWithTooltip
              text={peer.dns_label}
              maxChars={40}
              className={"whitespace-nowrap"}
            />
          </span>
        </CopyToClipboardText>
        <CopyToClipboardText
          message={"IP address has been copied to your clipboard"}
        >
          <span className={"dark:text-nb-gray-400 font-mono font-thin text-xs"}>
            {peer.ip}
          </span>
        </CopyToClipboardText>
      </div>
    </div>
  );
}
