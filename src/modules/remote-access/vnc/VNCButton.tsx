import Button from "@components/Button";
import { DropdownMenuItem } from "@components/DropdownMenu";
import { CircleHelpIcon, ScreenShareIcon } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Peer } from "@/interfaces/Peer";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { VNCTooltip } from "@/modules/remote-access/vnc/VNCTooltip";

type Props = {
  peer: Peer;
  isDropdown?: boolean;
};

const VNC_SUPPORTED_OS = new Set([
  OperatingSystem.LINUX,
  OperatingSystem.WINDOWS,
  OperatingSystem.APPLE,
  OperatingSystem.FREEBSD,
]);

export const VNCButton = ({ peer, isDropdown = false }: Props) => {
  const { permission } = usePermissions();

  const os = getOperatingSystem(peer?.os);
  if (!VNC_SUPPORTED_OS.has(os)) return null;

  const isVNCEnabled = peer?.local_flags?.server_vnc_allowed;
  const disabled = !peer.connected || !permission.peers.update || !isVNCEnabled;
  const hasPermission = permission.peers.update;

  const openVNCPage = () => {
    window.open(
      `peer/vnc?id=${peer.id}`,
      "_blank",
      "noopener,noreferrer,width=1200,height=800,left=100,top=100,location=no,toolbar=no,menubar=no,status=no",
    );
  };

  return (
    <>
      <div>
        <VNCTooltip
          isOnline={peer.connected}
          isVNCEnabled={!!isVNCEnabled}
          hasPermission={hasPermission}
          side={isDropdown ? "left" : "top"}
        >
          {isDropdown ? (
            <DropdownMenuItem
              onClick={openVNCPage}
              disabled={disabled}
              className={"w-full"}
            >
              <div className={"flex gap-3 items-center w-full"}>
                <ScreenShareIcon size={14} className={"shrink-0"} />
                VNC
              </div>
            </DropdownMenuItem>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={openVNCPage}
              disabled={disabled}
            >
              <ScreenShareIcon size={16} />
              VNC
              {disabled && <CircleHelpIcon size={12} />}
            </Button>
          )}
        </VNCTooltip>
      </div>
    </>
  );
};
