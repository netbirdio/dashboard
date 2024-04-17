import { IconDirectionSign } from "@tabler/icons-react";
import { InfoIcon } from "lucide-react";
import * as React from "react";
import { Route } from "@/interfaces/Route";
import { ExitNodeHelpTooltip } from "@/modules/exit-node/ExitNodeHelpTooltip";

type Props = {
  route: Route;
};
export default function PeerRouteNetworkCell({ route }: Props) {
  const isExitNode = route?.network === "0.0.0.0/0";

  return isExitNode ? (
    <ExitNodeHelpTooltip>
      <div className={"flex gap-2 items-center dark:text-nb-gray-300 group"}>
        <IconDirectionSign size={16} className={"text-yellow-400"} />
        Exit Node{" "}
        <InfoIcon
          size={14}
          className={
            "text-nb-gray-500 group-hover:text-nb-gray-400 transition-all"
          }
        />
      </div>
    </ExitNodeHelpTooltip>
  ) : (
    <div className={"font-mono dark:text-nb-gray-300 flex max-w-[10px]"}>
      {route.network}
    </div>
  );
}
