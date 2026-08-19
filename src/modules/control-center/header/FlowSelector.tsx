import { SegmentedTabs } from "@components/SegmentedTabs";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import {
  FolderGit2,
  MonitorSmartphoneIcon,
  NetworkIcon,
  UsersIcon,
} from "lucide-react";
import * as React from "react";
import { useAgentNetworkMode } from "@/modules/agent-network/useAgentNetworkMode";
import { useCloseOnCanvasClick } from "@/modules/control-center/hooks/useCloseOnCanvasClick";

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

  // Controlled so a canvas click closes it — the dropdown floats over the
  // ReactFlow pane, whose stopPropagation hides the click from Radix's own
  // outside-detection (same as the network selector).
  const [selectOpen, setSelectOpen] = React.useState(false);
  useCloseOnCanvasClick(selectOpen, () => setSelectOpen(false));

  const selectOptions = React.useMemo(() => {
    const options: SelectOption[] = [
      { value: FlowView.PEERS, label: "Peer", icon: MonitorSmartphoneIcon },
      { value: FlowView.USERS, label: "User", icon: UsersIcon },
      { value: FlowView.GROUPS, label: "Group", icon: FolderGit2 },
    ];
    if (!agentNetworkOnly) {
      options.push({
        value: FlowView.NETWORKS,
        label: "Networks",
        icon: NetworkIcon,
      });
    }
    return options;
  }, [agentNetworkOnly]);

  return (
    <>
      <div className={"lg:hidden min-w-[120px]"}>
        <SelectDropdown
          variant={"secondary"}
          value={value ?? ""}
          onChange={(v) => onChange?.(v as FlowView)}
          options={selectOptions}
          open={selectOpen}
          onOpenChange={setSelectOpen}
          popoverMinWidth={160}
          className={
            "!bg-nb-gray-920 !hover:bg-nb-gray-925 !text-nb-gray-300 !pr-3 !h-[40px] !py-0"
          }
          size={"xs"}
        />
      </div>
      <div className={"hidden lg:block"}>
        <SegmentedTabs
          value={value}
          onChange={(v) => onChange?.(v as FlowView)}
        >
          <SegmentedTabs.List
            className={
              "border-b rounded-b-lg text-sm font-medium bg-nb-gray-930 p-1"
            }
          >
            <SegmentedTabs.Trigger
              value={FlowView.PEERS}
              className={"text-xs px-3 py-[0.45rem]"}
              data-testid={"cc-flow-peers"}
            >
              <MonitorSmartphoneIcon size={12} />
              Peer
            </SegmentedTabs.Trigger>
            <SegmentedTabs.Trigger
              value={FlowView.USERS}
              className={"text-xs px-3 py-[0.45rem]"}
              data-testid={"cc-flow-users"}
            >
              <UsersIcon size={12} />
              User
            </SegmentedTabs.Trigger>
            <SegmentedTabs.Trigger
              value={FlowView.GROUPS}
              className={"text-xs px-3 py-[0.45rem]"}
              data-testid={"cc-flow-groups"}
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
                data-testid={"cc-flow-networks"}
              >
                <NetworkIcon size={12} />
                Networks
              </SegmentedTabs.Trigger>
            )}
          </SegmentedTabs.List>
        </SegmentedTabs>
      </div>
    </>
  );
};
