import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import FullTooltip from "@components/FullTooltip";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { IconChevronDown } from "@tabler/icons-react";
import * as React from "react";
import { usePeer } from "@/contexts/PeerProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { RDPButton } from "@/modules/remote-access/rdp/RDPButton";
import { SSHButton } from "@/modules/remote-access/ssh/SSHButton";
import { cn } from "@utils/helpers";

export const PeerConnectButton = () => {
  const { peer } = usePeer();
  const isConnected = peer.connected;
  const os = getOperatingSystem(peer?.os);
  const isMobile = os === OperatingSystem.ANDROID || os === OperatingSystem.IOS;

  if (isMobile) return;

  return isConnected ? (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <div className={"group"}>
            <ConnectButton />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-auto"
          align="start"
          side={"bottom"}
          sideOffset={8}
        >
          <SSHButton peer={peer} isDropdown={true} />
          <RDPButton peer={peer} isDropdown={true} />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  ) : (
    <FullTooltip
      content={
        <div className={"max-w-[200px] text-xs"}>
            Connecting via SSH or RDP is only available when the peer is online.
        </div>
      }
    >
      <ConnectButton disabled={true} />
    </FullTooltip>
  );
};

const ConnectButton = ({ disabled }: { disabled?: boolean }) => {
  return (
    <button
      className={cn(
        "flex gap-2 items-center text-sm text-nb-gray-300 hover:text-white disabled:cursor-not-allowed enabled:cursor-pointer enabled:hover:bg-nb-gray-800/60 rounded-md py-2 px-3 disabled:text-nb-gray-700",
        // group data state open
        "group-data-[state=open]:bg-nb-gray-800/30",
      )}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      Connect
      <IconChevronDown size={14} />
    </button>
  );
};
