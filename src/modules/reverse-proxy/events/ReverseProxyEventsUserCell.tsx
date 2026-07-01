import TextWithTooltip from "@components/ui/TextWithTooltip";
import { generateColorFromUser } from "@utils/helpers";
import * as React from "react";
import { useMemo } from "react";
import { usePeers } from "@/contexts/PeersProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { ReverseProxyEvent } from "@/interfaces/ReverseProxy";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  event: ReverseProxyEvent;
};

// ReverseProxyEventsUserCell renders the principal that authenticated
// the request. The proxy stamps user_id as user.Id when the caller
// resolves to a netbird user (OIDC, header, interactive auth, OR a
// tunnel-peer linked to a user) and as peer.ID for unlinked
// tunnel-peers (machine agents). Look up users first, then peers, so
// both human users and unattached agents render with their real
// display name; legacy rows from before the user-id-as-principal fix
// still resolve via the peers map.
export const ReverseProxyEventsUserCell = ({ event }: Props) => {
  const { users } = useUsers();
  const { peers } = usePeers();

  const user = useMemo(() => {
    if (!event.user_id) return undefined;
    return users?.find((u) => u.id === event.user_id);
  }, [users, event.user_id]);

  const peer = useMemo(() => {
    if (!event.user_id || user) return undefined;
    return peers?.find((p) => p.id === event.user_id);
  }, [peers, event.user_id, user]);

  if (!event.user_id) {
    return <EmptyRow />;
  }

  let displayName: string;
  let displaySub: string;
  let identityForColor: { id: string; name: string; email: string };
  if (user) {
    displayName = user.name || event.user_id;
    displaySub = user.email || "";
    identityForColor = {
      id: user.id,
      name: displayName,
      email: user.email ?? "",
    };
  } else if (peer) {
    displayName = peer.name || peer.hostname || event.user_id;
    displaySub = "Peer";
    identityForColor = {
      id: peer.id ?? event.user_id,
      name: displayName,
      email: "",
    };
  } else {
    displayName = event.user_id;
    displaySub = "";
    identityForColor = {
      id: event.user_id,
      name: displayName,
      email: "",
    };
  }

  return (
    <div className={"flex items-center gap-2 py-2 px-3"}>
      <div
        className={
          "w-8 h-8 rounded-full flex items-center justify-center text-white uppercase text-xs font-medium bg-nb-gray-900 shrink-0"
        }
        style={{
          color: generateColorFromUser(identityForColor),
        }}
      >
        {displayName?.charAt(0) || "?"}
      </div>

      <div className="flex flex-col gap-0 min-w-0">
        <span className={"text-sm text-nb-gray-200 truncate"}>
          <TextWithTooltip text={displayName} maxChars={20} />
        </span>
        {displaySub && (
          <span className={"text-xs text-nb-gray-400 font-light truncate"}>
            <TextWithTooltip text={displaySub} maxChars={25} />
          </span>
        )}
      </div>
    </div>
  );
};
