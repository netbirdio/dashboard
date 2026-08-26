import { SegmentedTabs } from "@components/SegmentedTabs";
import {
  FolderGit2,
  MonitorSmartphoneIcon,
  NetworkIcon,
  UsersIcon,
} from "lucide-react";
import * as React from "react";
import { useAgentNetworkMode } from "@/modules/agent-network/useAgentNetworkMode";

export enum FlowView {
  NETWORKS = "networks",
  GROUPS = "groups",
  PEERS = "peers",
  USERS = "users",
}

type Props = {
  value?: FlowView;
  onChange?: (value: FlowView) => void;
};

export const FlowSelector = ({ value, onChange }: Props) => {
  const { only: agentNetworkOnly } = useAgentNetworkMode();

  return (
    <SegmentedTabs value={value} onChange={(v) => onChange?.(v as FlowView)}>
      <SegmentedTabs.List
        className={
          "border-b rounded-b-lg text-sm font-medium bg-nb-gray-930 p-1"
        }
      >
        <SegmentedTabs.Trigger
          value={FlowView.PEERS}
          className={"text-xs px-3 py-1"}
        >
          <MonitorSmartphoneIcon size={12} />
          Peer
        </SegmentedTabs.Trigger>
        <SegmentedTabs.Trigger
          value={FlowView.USERS}
          className={"text-xs px-3 py-1"}
        >
          <UsersIcon size={12} />
          User
        </SegmentedTabs.Trigger>
        <SegmentedTabs.Trigger
          value={FlowView.GROUPS}
          className={"text-xs px-3 py-1"}
        >
          <FolderGit2 size={12} />
          Group
        </SegmentedTabs.Trigger>
        {/* The agent-network repackaging drops Networks as a top-level
            pivot. Keep it for everyone else so flag-off behaviour is
            unchanged. */}
        {!agentNetworkOnly && (
          <SegmentedTabs.Trigger
            value={FlowView.NETWORKS}
            className={"text-xs px-3 py-[0.45rem]"}
          >
            <NetworkIcon size={12} />
            Networks
          </SegmentedTabs.Trigger>
        )}
      </SegmentedTabs.List>
    </SegmentedTabs>
  );
};
