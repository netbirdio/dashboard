import { SmallBadge } from "@components/ui/SmallBadge";
import { cn } from "@utils/helpers";
import { type Node, Position } from "@xyflow/react";
import * as React from "react";
import AIProviderLogo from "@/modules/agent-network/AIProviderLogo";
import { AIProviderId } from "@/modules/agent-network/data/mockData";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { AllHandles } from "@/modules/control-center/handles/AllHandles";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";

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
  const { isDraft } = useDraftMode();

  return (
    <div
      className={cn(
        "cc-provider-node relative rounded-lg transition-all group group/node",
        "border bg-nb-gray-940 border-nb-gray-850 h-[64px] flex items-center pr-5 pl-3",
        "hover:bg-nb-gray-930 hover:border-nb-gray-800",
        !enabled && "opacity-60",
      )}
    >
      <div className={"flex items-center gap-2.5 text-nb-gray-300"}>
        <div
          className={
            "h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 group-hover:bg-nb-gray-800 transition-all"
          }
        >
          <AIProviderLogo providerId={data.providerId} size={16} />
        </div>
        <div
          className={
            "flex flex-col gap-0 justify-center leading-tight max-w-[180px]"
          }
        >
          <span
            className={
              "font-normal text-[0.85rem] text-nb-gray-100 flex items-center gap-2 mb-1 mt-1 relative top-[0.05rem]"
            }
          >
            {/* Not TruncatedText: its container is w-full, which would push
                the badge to the far edge instead of beside the name. */}
            <span className={"truncate min-w-0"}>{data.name}</span>
            {data.id?.startsWith("new-") ? <SmallBadge /> : null}
          </span>
          {data.upstreamUrl && (
            // Plain text, not TruncatedText: that renders a block, which
            // breaks the half-step nudge DeviceCard's second line relies on.
            <span
              className={
                "font-normal text-sm text-nb-gray-400 relative -top-[0.1rem] block truncate"
              }
            >
              {data.upstreamUrl}
            </span>
          )}
        </div>
      </div>

      {/* Connecting a provider is a draft gesture: it records a change. */}
      <AllHandles />
      {isDraft && (
        <>
          <ConnectHandle type={"source"} position={Position.Left} />
          <ConnectHandle type={"source"} position={Position.Right} />
        </>
      )}
    </div>
  );
};
