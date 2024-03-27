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
    <div>
      <IconDirectionSign size={15} className={"shrink-0 text-yellow-400"} />
    </div>
  ) : null;
};
