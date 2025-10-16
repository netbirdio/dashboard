import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import { IconInfoCircle } from "@tabler/icons-react";
import {
  MonitorIcon,
  MoreVertical,
  TerminalSquare,
  TimerResetIcon,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { useSWRConfig } from "swr";
import { usePeer } from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { ExitNodeDropdownButton } from "@/modules/exit-node/ExitNodeDropdownButton";

export default function PeerActionCell() {
  const { peer, deletePeer, update, toggleSSH, setSSHInstructionsModal } =
    usePeer();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();

  const toggleLoginExpiration = async () => {
    const text = peer.login_expiration_enabled ? "disabled" : "enabled";
    const disableLoginExpiration = peer.login_expiration_enabled;
    notify({
      title: `Session expiration is ${text}`,
      description: `Session expiration for peer ${peer.name} was successfully ${text}.`,
      promise: update({
        loginExpiration: !peer.login_expiration_enabled,
        inactivityExpiration: disableLoginExpiration
          ? false
          : peer.inactivity_expiration_enabled,
      }).then(() => {
        mutate("/peers");
        mutate("/groups");
      }),
      loadingMessage: "Updating session expiration...",
    });
  };

  return (
    <div className={"flex justify-end pr-4 gap-3"}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <Button variant={"secondary"} className={"!px-3"}>
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto" align="end">
          <DropdownMenuItem
            onClick={() => router.push("/peer?id=" + peer.id)}
            disabled={!permission.peers.read}
          >
            <div className={"flex gap-3 items-center"}>
              <MonitorIcon size={14} className={"shrink-0"} />
              View Details
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <FullTooltip
            content={
              <div
                className={"flex gap-2 items-center !text-nb-gray-300 text-xs"}
              >
                <IconInfoCircle size={14} />
                <span>
                  Expiration is disabled for all peers added with an setup-key.
                </span>
              </div>
            }
            className={"w-full block"}
            disabled={!!peer.user_id}
          >
            <DropdownMenuItem
              onClick={toggleLoginExpiration}
              disabled={!peer.user_id || !permission.peers.update}
            >
              <div className={"flex gap-3 items-center w-full"}>
                <TimerResetIcon size={14} className={"shrink-0"} />
                {peer.login_expiration_enabled ? "Disable" : "Enable"} Session
                Expiration
              </div>
            </DropdownMenuItem>
          </FullTooltip>

          <DropdownMenuItem
            onClick={() =>
              peer.ssh_enabled
                ? toggleSSH(false)
                : setSSHInstructionsModal(true)
            }
            disabled={!permission.peers.update}
          >
            <div className={"flex gap-3 items-center w-full"}>
              <TerminalSquare size={14} className={"shrink-0"} />
              <div className={"flex justify-between items-center w-full"}>
                {peer.ssh_enabled ? "Disable" : "Enable"} SSH Access
              </div>
            </div>
          </DropdownMenuItem>

          <ExitNodeDropdownButton peer={peer} />

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={deletePeer}
            variant={"danger"}
            disabled={!permission.peers.delete}
          >
            <div className={"flex gap-3 items-center"}>
              <Trash2 size={14} className={"shrink-0"} />
              Delete
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
