import { SegmentedTabs } from "@components/SegmentedTabs";
import { FolderGit2, MonitorSmartphoneIcon, NetworkIcon } from "lucide-react";
import * as React from "react";

export enum FlowView {
  NETWORKS = "networks",
  GROUPS = "groups",
  PEERS = "peers",
}

type Props = {
  value?: FlowView;
  onChange?: (value: FlowView) => void;
};

export const FlowSelector = ({ value, onChange }: Props) => {
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
          Peers
        </SegmentedTabs.Trigger>
        <SegmentedTabs.Trigger
          value={FlowView.GROUPS}
          className={"text-xs px-3 py-1"}
        >
          <FolderGit2 size={12} />
          Groups
        </SegmentedTabs.Trigger>
        <SegmentedTabs.Trigger
          value={FlowView.NETWORKS}
          className={"text-xs px-3 py-[0.45rem]"}
        >
          <NetworkIcon size={12} />
          Networks
        </SegmentedTabs.Trigger>
      </SegmentedTabs.List>
    </SegmentedTabs>
  );
};
