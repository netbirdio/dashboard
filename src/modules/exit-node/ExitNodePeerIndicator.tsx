import FullTooltip from "@components/FullTooltip";
import { IconDirectionSign } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import * as React from "react";
import { Peer } from "@/interfaces/Peer";
import { Route } from "@/interfaces/Route";

type Props = {
  peer: Peer;
};
export const ExitNodePeerIndicator = ({ peer }: Props) => {
  const { data: routes } = useFetchApi<Route[]>(`/routes`);
  const isExitNode = routes?.some((route) => route?.peer === peer.id);

  return isExitNode ? (
    <FullTooltip
      content={
        <div className={"text-xs max-w-xs"}>
          This peer is used as an exit node. All internet traffic will be routed
          through this peer.
        </div>
      }
    >
      <IconDirectionSign size={15} className={"text-yellow-400 shrink-0"} />
    </FullTooltip>
  ) : null;
};
