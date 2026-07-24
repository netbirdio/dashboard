import Button from "@components/Button";
import { DropdownMenuItem } from "@components/DropdownMenu";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { CircleHelpIcon, MonitorIcon } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { Peer } from "@/interfaces/Peer";
import { RDPTooltip } from "@/modules/remote-access/rdp/RDPTooltip";

type Props = {
  peer: Peer;
  isDropdown?: boolean;
};

const RDP_SUPPORTED_OS = new Set([
  OperatingSystem.WINDOWS,
  OperatingSystem.LINUX,
  OperatingSystem.FREEBSD,
]);

export const RDPButton = ({ peer, isDropdown = false }: Props) => {
  const { permission } = usePermissions();

  const os = getOperatingSystem(peer?.os);
  if (!RDP_SUPPORTED_OS.has(os)) return null;

  const disabled = !peer.connected || !permission.peers.update;
  const hasPermission = permission.peers.update;

  const openRDPPage = () => {
    window.open(
      `/peer/rdp?id=${peer.id}`,
      "_blank",
      "noopener,noreferrer,width=1200,height=650,left=100,top=100,location=no,toolbar=no,menubar=no,status=no",
    );
  };

  return (
    <div>
      <RDPTooltip
        disabled={!disabled}
        hasPermission={hasPermission}
        side={isDropdown ? "left" : "top"}
      >
        {isDropdown ? (
          <DropdownMenuItem
            onClick={openRDPPage}
            disabled={disabled}
            className={"w-full"}
          >
            <div className={"flex gap-3 items-center w-full"}>
              <MonitorIcon size={14} className={"shrink-0"} />
              RDP
            </div>
          </DropdownMenuItem>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={openRDPPage}
            disabled={disabled}
          >
            <MonitorIcon size={16} />
            RDP
            {disabled && <CircleHelpIcon size={12} />}
          </Button>
        )}
      </RDPTooltip>
    </div>
  );
};
