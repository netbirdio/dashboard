import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import LoginExpiredBadge from "@components/ui/LoginExpiredBadge";
import { IconCloudLock } from "@tabler/icons-react";
import { HelpCircle } from "lucide-react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePeer } from "@/contexts/PeerProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { Peer } from "@/interfaces/Peer";

type Props = {
  peer: Peer;
};

export default function PeerStatusCell({ peer }: Props) {
  const { update } = usePeer();
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const needsApproval = peer.approval_required;
  const { isOwnerOrAdmin } = useLoggedInUser();
  const canApprove = isOwnerOrAdmin;

  const approvePeer = async () => {
    const choice = await confirm({
      title: `Approve peer '${peer.name}'?`,
      description: "Are you sure you want to approve this peer?",
      confirmText: "Approve",
      cancelText: "Cancel",
      type: "default",
    });
    if (choice) {
      notify({
        title: `Peer ${peer.name} approved`,
        description: `This peer was approved and can now connect to other peers.`,
        promise: update(
          peer.name,
          peer.ssh_enabled,
          peer.login_expiration_enabled,
          peer.ipv6_enabled,
          false,
        ).then(() => {
          mutate("/peers");
          mutate("/groups");
        }),
        loadingMessage: "Updating login expiration...",
      });
    }
  };

  return needsApproval ? (
    <div className={"flex gap-3 items-center text-xs"}>
      <FullTooltip
        content={
          <div className={"max-w-xs text-xs"}>
            The peer needs to be approved by an administrator before it can
            connect to other peers.
          </div>
        }
        interactive={false}
      >
        <Badge variant={"netbird"} className={"px-3 font-medium"}>
          <HelpCircle size={12} />
          Approval required
        </Badge>
      </FullTooltip>
      <Button
        variant={"secondary"}
        size={"xs"}
        className={"h-[32px]"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!canApprove) return;
          approvePeer();
        }}
      >
        Approve
      </Button>
    </div>
  ) : (
    <div className={"flex gap-3 items-center text-xs"}>
      {!peer.login_expiration_enabled && (
        <Badge variant={"gray"} className={"px-3"}>
          <IconCloudLock size={15} className={"mr-1"} />
          Expiration disabled
        </Badge>
      )}

      <LoginExpiredBadge loginExpired={peer.login_expired} />
    </div>
  );
}
