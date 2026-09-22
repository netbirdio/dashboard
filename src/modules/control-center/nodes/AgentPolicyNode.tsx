import { SmallBadge } from "@components/ui/SmallBadge";
import { cn } from "@utils/helpers";
import { Handle, type Node, Position, useConnection } from "@xyflow/react";
import * as React from "react";
import { useIsContextMenuTarget } from "@/modules/control-center/contexts/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";
import { FullAreaTargetHandle } from "@/modules/control-center/handles/FullAreaTargetHandle";

// Kept thin so the React Flow node JSON stays cheap to clone.
export type AgentPolicyNodeData = {
  id: string;
  name: string;
  enabled?: boolean;
};

type AgentPolicyNodeProps = Node<AgentPolicyNodeData, "agentPolicyNode">;

export const AgentPolicyNode = ({ data, id }: AgentPolicyNodeProps) => {
  const isActive = data.enabled !== false;
  const { isDraft } = useDraftMode();
  const isDropTarget = useConnection(
    (c) => c.inProgress && c.fromNode?.id !== id,
  );
  const showHalo = useIsContextMenuTarget(id);

  return (
    <div
      className={cn(
        // `group/node` is what the connect bubbles reveal themselves on; without
        // it they render and stay invisible. Same shell as PolicyNode.
        "relative group/node bg-nb-gray-940 hover:bg-nb-gray-930 hover:border-nb-gray-800 cursor-pointer border border-nb-gray-800 rounded-full flex justify-between transition-all",
        !isActive && "opacity-60",
        isDraft &&
          isDropTarget &&
          "hover:bg-nb-gray-930 hover:ring-2 ring-white",
        showHalo && "ring-2 ring-sky-500",
      )}
    >
      <div className={"flex items-center justify-center"}>
        <div
          className={cn(
            "h-2 w-2 rounded-full ml-3 mr-2",
            isActive ? "bg-green-400" : "bg-nb-gray-400",
          )}
        ></div>
      </div>
      <div className={"pt-2.5 pb-[0.6rem] pr-3 flex gap-4 leading-none"}>
        <div
          className={
            "text-nb-gray-200 font-normal whitespace-nowrap text-[0.8rem] flex items-center justify-center w-full"
          }
        >
          <div className={"truncate max-w-[200px]"}>{data.name}</div>
          {data.id?.startsWith("new-") && <SmallBadge className={"ml-2"} />}
        </div>
      </div>

      {/* Anchors for the edges only; the connect gestures use the bubbles. */}
      <Handle
        type="source"
        position={Position.Right}
        id={"sr"}
        className={"opacity-0"}
        isConnectable={false}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={"tl"}
        className={"opacity-0"}
        isConnectable={false}
      />

      {/* Either bubble reaches the same side: a group is always a source and a
          provider always a destination. */}
      {isDraft && (
        <>
          <ConnectHandle type={"source"} position={Position.Left} />
          <ConnectHandle type={"source"} position={Position.Right} />
          <FullAreaTargetHandle isConnectable={isDropTarget} />
        </>
      )}
    </div>
  );
};
