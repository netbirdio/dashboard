import { cn } from "@utils/helpers";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import { useLoggedInUser, useUsers } from "@/contexts/UsersProvider";
import { Peer } from "@/interfaces/Peer";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";
import { ExitNodePeerIndicator } from "@/modules/exit-node/ExitNodePeerIndicator";

type Props = {
  peer: Peer;
  linkToPeer?: boolean;
};
export default function PeerNameCell({ peer, linkToPeer = true }: Props) {
  const { users } = useUsers();
  const router = useRouter();
  const { isOwnerOrAdmin } = useLoggedInUser();

  const userOfPeer = useMemo(() => {
    return users?.find((user) => user.id === peer.user_id);
  }, [users, peer.user_id]);

  const displayUser = userOfPeer?.email || userOfPeer?.name || userOfPeer?.id || peer?.user_id

  return (
    <div>
      <div
        className={cn(
          "flex items-center max-w-[300px] gap-2 dark:text-neutral-300 text-neutral-500 transition-all py-2 px-3 rounded-md ",
          linkToPeer &&
            "hover:text-neutral-100 hover:bg-nb-gray-800/60 cursor-pointer",
        )}
        data-testid="peer-name-cell"
        aria-label={`View details of peer ${peer.name}`}
        onClick={() => linkToPeer && router.push("/peer?id=" + peer.id)}
      >
        <ActiveInactiveRow
          active={peer.connected}
          text={peer.name}
          additionalInfo={
            isOwnerOrAdmin && <ExitNodePeerIndicator peer={peer} />
          }
        >
          <div className={"text-nb-gray-400 font-light truncate"}>
            {displayUser && `user: ${displayUser}`}
          </div>
        </ActiveInactiveRow>
      </div>
    </div>
  );
}
