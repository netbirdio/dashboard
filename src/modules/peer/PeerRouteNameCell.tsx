import * as React from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { Route } from "@/interfaces/Route";

type Props = {
  route: Route;
};
export default function PeerRouteNameCell({ route }: Props) {
  return (
    <div className={"flex items-center gap-2 text-nb-gray-200"}>
      <NetworkRoutesIcon size={16} className={"shrink-0 fill-nb-gray-300"} />
      {route.network_id}
    </div>
  );
}
