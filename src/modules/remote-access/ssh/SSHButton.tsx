import Button from "@components/Button";
import { DropdownMenuItem } from "@components/DropdownMenu";
import { CircleHelpIcon, TerminalIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Peer } from "@/interfaces/Peer";
import { SSHCredentialsModal } from "@/modules/remote-access/ssh/SSHCredentialsModal";
import { SSHTooltip } from "@/modules/remote-access/ssh/SSHTooltip";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { OperatingSystem } from "@/interfaces/OperatingSystem";

type Props = {
  peer: Peer;
  isDropdown?: boolean;
};

export const SSHButton = ({ peer, isDropdown = false }: Props) => {
  const [modal, setModal] = useState(false);
  const { permission } = usePermissions();

  const disabled =
    !peer.connected || !peer.ssh_enabled || !permission.peers.update;

  const hasPermission = permission.peers.update;

  const os = getOperatingSystem(peer?.os);
  const isWindows = os === OperatingSystem.WINDOWS;
  const isMobile = os === OperatingSystem.ANDROID || os === OperatingSystem.IOS;
  const isSSHSupported = !isWindows && !isMobile;

  return (
    isSSHSupported && (
      <>
        {modal && (
          <SSHCredentialsModal
            open={modal}
            onOpenChange={setModal}
            peer={peer}
          />
        )}
        <div>
          <SSHTooltip
            disabled={!disabled}
            hasPermission={hasPermission}
            side={isDropdown ? "left" : "top"}
          >
            {isDropdown ? (
              <DropdownMenuItem
                onClick={() => setModal(true)}
                disabled={disabled}
                className={"w-full"}
              >
                <div className={"flex gap-3 items-center w-full"}>
                  <TerminalIcon size={14} className={"shrink-0"} />
                  SSH
                </div>
              </DropdownMenuItem>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setModal(true)}
                disabled={disabled}
              >
                <TerminalIcon size={16} />
                SSH
                {disabled && <CircleHelpIcon size={12} />}
              </Button>
            )}
          </SSHTooltip>
        </div>
      </>
    )
  );
};
