import { IconDirectionSign } from "@tabler/icons-react";
import { HelpCircle } from "lucide-react";
import * as React from "react";
import { ExitNodeHelpTooltip } from "@/modules/exit-node/ExitNodeHelpTooltip";

type Props = {
  network: string;
};
export default function GroupedRouteNetworkRangeCell({ network }: Props) {
  const isExitNode = network === "0.0.0.0/0";

  return isExitNode ? (
    <div className={"inline-flex gap-2 items-center text-nb-gray-300 text-sm"}>
      <IconDirectionSign size={16} className={"text-yellow-400"} />
      Exit Node{" "}
      <ExitNodeHelpTooltip>
        <HelpCircle
          size={12}
          className={"text-nb-gray-400 hover:text-nb-gray-300 transition-all"}
        />
      </ExitNodeHelpTooltip>
    </div>
  ) : (
    <div className={"font-mono dark:text-nb-gray-300 flex max-w-[10px]"}>
      {network}
    </div>
  );
}
