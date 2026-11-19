import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { HelpCircle, PlusCircle } from "lucide-react";
import * as React from "react";
import { ExitNode } from "@/interfaces/ExitNode";
import { getHighAvailability } from "@/modules/exit-nodes/exitNodeHelpers";
import { useExitNodes } from "@/modules/exit-nodes/ExitNodesProvider";
import { useExitNodePermissions } from "@/modules/exit-nodes/useExitNodePermissions";

type Props = {
  exitNode: ExitNode;
};

/**
 * Enabled peers and whether they make the exit node highly available. A
 * click on the badge bubbles up to the row and expands its peers.
 */
export default function ExitNodeHighAvailabilityCell({
  exitNode,
}: Readonly<Props>) {
  const permission = useExitNodePermissions();
  const { openExitNodeModal } = useExitNodes();
  const { activePeerCount, hasActivePeers, isHighlyAvailable } =
    getHighAvailability(exitNode);

  return (
    <div className={"flex gap-3 items-center"}>
      <FullTooltip
        interactive={false}
        content={
          <div className={"max-w-xs text-xs"}>
            {isHighlyAvailable ? (
              <>
                High availability is{" "}
                <span className={"text-green-500 font-medium"}>active</span> for
                this exit node.
                <div className={"inline-flex mt-2"}>
                  You can add more peers to increase the availability of this
                  exit node.
                </div>
              </>
            ) : (
              <>
                High availability is currently{" "}
                <span className={"text-yellow-400 font-medium"}>inactive</span>{" "}
                for this exit node.
                <div className={"inline-flex mt-2"}>
                  Go ahead and add more peers to enable high availability for
                  this exit node.
                </div>
              </>
            )}
          </div>
        }
      >
        {hasActivePeers && (
          <Badge
            variant={isHighlyAvailable ? "green" : "gray"}
            className={cn(
              "inline-flex gap-2  min-w-[110px] font-medium items-center justify-center min-h-[34px] cursor-pointer",
            )}
            useHover={true}
            data-testid={"exit-node-high-availability"}
          >
            <>
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  isHighlyAvailable ? "bg-green-500" : "bg-yellow-400",
                )}
              ></div>
              {activePeerCount} Peer(s)
            </>
            <HelpCircle size={12} />
          </Badge>
        )}
      </FullTooltip>
      <Button
        size={"xs"}
        variant={"secondary"}
        className={"!px-3"}
        onClick={(e) => {
          e.stopPropagation();
          openExitNodeModal(exitNode, { tab: "peers", addPeer: true });
        }}
        disabled={!permission?.update}
        aria-label={"Add peer"}
      >
        <PlusCircle size={12} />
        Add
      </Button>
    </div>
  );
}
