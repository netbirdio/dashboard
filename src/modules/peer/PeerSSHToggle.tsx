import FancyToggleSwitch from "@components/FancyToggleSwitch";
import FullTooltip from "@components/FullTooltip";
import { LockIcon, TerminalSquare } from "lucide-react";
import * as React from "react";
import { usePeer } from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";

export const PeerSSHToggle = () => {
  const { permission } = usePermissions();
  const { peer, toggleSSH, setSSHInstructionsModal } = usePeer();

  return (
    <>
      <FullTooltip
        content={
          <div className={"flex gap-2 items-center !text-nb-gray-300 text-xs"}>
            <LockIcon size={14} />
            <span>
              {`You don't have the required permissions to update this
                          setting.`}
            </span>
          </div>
        }
        interactive={false}
        className={"w-full block"}
        disabled={permission.peers.update}
      >
        <FancyToggleSwitch
          value={peer.ssh_enabled}
          disabled={!permission.peers.update}
          onChange={(enable) =>
            enable ? setSSHInstructionsModal(true) : toggleSSH(false)
          }
          label={
            <>
              <TerminalSquare size={16} />
              SSH Access
            </>
          }
          helpText={
            "Enable the SSH server on this peer to access the machine via an secure shell."
          }
        />
      </FullTooltip>
    </>
  );
};
