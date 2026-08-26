import { cn } from "@utils/helpers";
import { Handle, type Node, Position } from "@xyflow/react";
import * as React from "react";

// AgentPolicyNodeData carries the minimum identity for an agent-network
// policy node in the Control Center graph. We keep the payload thin so
// the React-Flow node JSON stays cheap to clone — the graph only needs
// the id (for edge wiring) and the name (for display).
export type AgentPolicyNodeData = {
  id: string;
  name: string;
  enabled?: boolean;
};

type AgentPolicyNodeProps = Node<AgentPolicyNodeData, "agentPolicyNode">;

// AgentPolicyNode mirrors the visual treatment of PolicyNode (rounded
// pill with a status dot) so the Control Center stays visually
// consistent across the two policy types. The right-side label slot
// shows the policy kind so an operator can tell agent-network policies
// from access-control policies at a glance.
export const AgentPolicyNode = ({ data }: AgentPolicyNodeProps) => {
  const isActive = data.enabled !== false;
  return (
    <div
      className={cn(
        "relative bg-nb-gray-940 hover:bg-nb-gray-930 cursor-pointer border border-nb-gray-800 rounded-full flex justify-between overflow-hidden",
        !isActive && "opacity-60",
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
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id={"sr"}
        className={"opacity-0"}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={"tl"}
        className={"opacity-0"}
      />
    </div>
  );
};
