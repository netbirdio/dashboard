import { cn } from "@utils/helpers";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import { useLoggedInUser, useUsers } from "@/contexts/UsersProvider";
import { Peer } from "@/interfaces/Peer";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";
import { ExitNodePeerIndicator } from "@/modules/exit-node/ExitNodePeerIndicator";
import { EphemeralPeerIndicator } from "@/modules/peer/EphemeralPeerIndicator";
import { ExpirationDisabledIndicator } from "@/modules/peer/ExpirationDisabledIndicator";
import { usePeerIssueIcon } from "@/modules/peer/PeerIssueIcon";

type Props = {
  peer: Peer;
  linkToPeer?: boolean;
  fluid?: boolean;
};
export default function PeerNameCell({
  peer,
  linkToPeer = true,
  fluid = false,
}: Props) {
  const { users } = useUsers();
  const router = useRouter();
  const { isOwnerOrAdmin } = useLoggedInUser();
  const issueIcon = usePeerIssueIcon(peer);

  const userOfPeer = useMemo(() => {
    return users?.find((user) => user.id === peer.user_id);
  }, [users, peer.user_id]);

  const displayUserEmailOrName = userOfPeer?.email || userOfPeer?.name;
  const displayUserId = userOfPeer?.id || peer?.user_id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 text-nb-gray-300 dark:text-neutral-300 transition-all py-2 px-3 rounded-md ",
          fluid ? "w-fit max-w-full min-w-0" : "max-w-[280px]",
          linkToPeer &&
            "hover:text-nb-gray-100 dark:hover:text-neutral-100 cursor-pointer",
          // In a fluid column the highlight spans the table cell, not just
          // the text: it is drawn against the cell's content box and shown
          // while the cell is hovered (the column sets `group/name-cell`).
          linkToPeer &&
            (fluid
              ? "before:absolute before:inset-0 before:-z-[1] before:rounded-md before:transition-all group-hover/name-cell:before:bg-nb-gray-900/60 group-hover/name-cell:text-nb-gray-100 dark:group-hover/name-cell:text-neutral-100"
              : "hover:bg-nb-gray-900/60"),
        )}
        data-testid="peer-name-cell"
        aria-label={`View details of peer ${peer.name}`}
        onClick={(e) => {
          if (!linkToPeer) return;
          e.preventDefault();
          e.stopPropagation();
          router.push("/peer?id=" + peer.id);
        }}
      >
        <ActiveInactiveRow
          active={peer.connected}
          text={peer.name}
          fluid={fluid}
          additionalInfo={
            isOwnerOrAdmin && (
              <>
                <ExitNodePeerIndicator peer={peer} />
                <EphemeralPeerIndicator peer={peer} />
                <ExpirationDisabledIndicator peer={peer} />
              </>
            )
          }
        >
          <div className={"text-nb-gray-400 font-light truncate"}>
            {displayUserEmailOrName ||
              (displayUserId && `user: ${displayUserId}`)}
          </div>
        </ActiveInactiveRow>
        {isOwnerOrAdmin && (!fluid || issueIcon) && (
          <div
            className={
              "ml-auto shrink-0 w-6 h-6 flex items-center justify-center"
            }
          >
            {issueIcon}
          </div>
        )}
      </div>
    </div>
  );
}
