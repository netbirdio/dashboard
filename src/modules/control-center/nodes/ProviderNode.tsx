import { cn } from "@utils/helpers";
import { Handle, type Node, Position } from "@xyflow/react";
import * as React from "react";
import AIProviderLogo from "@/modules/agent-network/AIProviderLogo";
import { AIProviderId } from "@/modules/agent-network/data/mockData";

// Kept thin so the React Flow node JSON stays cheap to clone.
export type AgentProviderNodeData = {
  id: string;
  providerId: AIProviderId;
  name: string;
  upstreamUrl?: string;
  enabled?: boolean;
};

type ProviderNodeProps = Node<AgentProviderNodeData, "providerNode">;

export const ProviderNode = ({ data }: ProviderNodeProps) => {
  const enabled = data.enabled ?? true;
  return (
    <div
      className={cn(
        "cc-provider-node bg-nb-gray-940 border border-nb-gray-800 rounded-lg overflow-hidden transition-all",
        !enabled && "opacity-60",
      )}
    >
      <div
        className={
          "flex w-full items-center gap-3 text-nb-gray-300 text-sm pl-3 pr-5 py-3 font-normal"
        }
      >
        <div
          className={
            "h-9 w-9 rounded-md flex items-center justify-center shrink-0 overflow-hidden"
          }
        >
          <AIProviderLogo providerId={data.providerId} size={36} />
        </div>
        <div className={"min-w-0"}>
          <div className={"text-nb-gray-200 font-normal whitespace-nowrap"}>
            {data.name}
          </div>
          {data.upstreamUrl && (
            <div
              className={
                "text-nb-gray-400 whitespace-nowrap text-xs truncate max-w-[220px]"
              }
            >
              {data.upstreamUrl}
            </div>
          )}
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