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
import { IconCloudLock, IconInfoCircle } from "@tabler/icons-react";
import {
  MonitorIcon,
  MoreVertical,
  TerminalSquare,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { useSWRConfig } from "swr";
import { usePeer } from "@/contexts/PeerProvider";
import { ExitNodeDropdownButton } from "@/modules/exit-node/ExitNodeDropdownButton";

export default function PeerActionCell() {
  const { peer, deletePeer, update, openSSHDialog } = usePeer();
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const toggleLoginExpiration = async () => {
    const text = peer.login_expiration_enabled ? "disabled" : "enabled";
    notify({
      title: `Login expiration is ${text}`,
      description: `The Login expiration for the peer ${peer.name} was successfully ${text}.`,
      promise: update(
        peer.name,
        peer.ssh_enabled,
        !peer.login_expiration_enabled,
        peer.ipv6_enabled,
      ).then(() => {
        mutate("/peers");
        mutate("/groups");
      }),
      loadingMessage: "Updating login expiration...",
    });
  };

  const toggleSSH = async () => {
    const text = peer.ssh_enabled ? "disabled" : "enabled";
    notify({
      title: `SSH Server is ${text}`,
      description: `The SSH Server for the peer ${peer.name} was successfully ${text}.`,
      promise: update(
        peer.name,
        !peer.ssh_enabled,
        peer.login_expiration_enabled,
        peer.ipv6_enabled,
      ).then(() => {
        mutate("/peers");
        mutate("/groups");
      }),
      loadingMessage: "Updating SSH access...",
    });
  };

  return (
    <div className={"flex justify-end pr-4"}>
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
          <DropdownMenuItem onClick={() => router.push("/peer?id=" + peer.id)}>
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
                  Login expiration is disabled for all peers added with an
                  setup-key.
                </span>
              </div>
            }
            className={"w-full block"}
            disabled={!!peer.user_id}
          >
            <DropdownMenuItem
              onClick={toggleLoginExpiration}
              disabled={!peer.user_id}
            >
              <div className={"flex gap-3 items-center w-full"}>
                <IconCloudLock size={14} className={"shrink-0"} />
                {peer.login_expiration_enabled ? "Disable" : "Enable"} Login
                Expiration
              </div>
            </DropdownMenuItem>
          </FullTooltip>

          <DropdownMenuItem
            onClick={() =>
              peer.ssh_enabled
                ? toggleSSH()
                : openSSHDialog().then((enable) =>
                    enable ? toggleSSH() : null,
                  )
            }
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

          <DropdownMenuItem onClick={deletePeer} variant={"danger"}>
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
