import { cn } from "@utils/helpers";
import { Handle, type Node, Position } from "@xyflow/react";
import * as React from "react";
import AIProviderLogo from "@/modules/agent-network/AIProviderLogo";
import { AIProviderId } from "@/modules/agent-network/data/mockData";

// AgentProviderNodeData is the shape of payload each provider node in
// the Control Center graph carries. We don't depend on the full
// Provider object from /agent-network/providers because the graph only
// needs identity + display, and a thin payload keeps the React-Flow
// node JSON cheap to clone.
export type AgentProviderNodeData = {
  id: string;
  providerId: AIProviderId;
  name: string;
  upstreamUrl?: string;
  enabled?: boolean;
};

type ProviderNodeProps = Node<AgentProviderNodeData, "providerNode">;

// ProviderNode renders an agent-network provider in the Control Center
// graph. Visually it follows the GroupNode template (avatar square +
// title + subtitle) so providers feel like siblings to groups and
// resources in the destination column of a Group view.
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