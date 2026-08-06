import { SmallBadge } from "@components/ui/SmallBadge";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { cn, singularize } from "@utils/helpers";
import { type Node, Position, useConnection, useStore } from "@xyflow/react";
import * as React from "react";
import { Group } from "@/interfaces/Group";
import {
  useDestinationGroup,
  useIsContextMenuTarget,
} from "@/modules/control-center/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { GroupNode } from "@/modules/control-center/nodes/GroupNode";
import { AllHandles } from "@/modules/control-center/handles/AllHandles";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";

type ResourceGroupNode = Node<
  {
    group: Group;
    enabled?: boolean;
    showHandles?: boolean;
    // Set by the drag-to-group tick while a droppable node hovers this group.
    dropTarget?: boolean;
  },
  "resourceGroupNode"
>;

// A resource group shown INSIDE a network frame: same row anatomy as the draft
// resource node but flat (no card background/border/padding). Laid out by the
// frame like resources; dragging it moves the whole frame.
export const ResourceGroupNode = ({ data, id, parentId }: ResourceGroupNode) => {
  const { group, showHandles = true } = data;
  const { isDraft, drillDownNetworkNodeId } = useDraftMode();
  const { selectedDestinationGroup, setSelectedDestinationGroup } =
    useDestinationGroup();
  const isContextTarget = useIsContextMenuTarget(id);
  // Panel selection is keyed by group id, or by node id for draft groups —
  // same rule as GroupNode.
  const isPanelActive =
    selectedDestinationGroup !== "" &&
    (selectedDestinationGroup === group?.id || selectedDestinationGroup === id);
  const showHalo = isPanelActive || isContextTarget;
  // Framed rows accept connection DROPS in every view; only dragging FROM the
  // row stays drill-down-only (same rule as ResourceNode).
  const isFramed = !!parentId?.startsWith("network-");
  const handlesActive = !isFramed || drillDownNetworkNodeId === parentId;
  const isTarget = useConnection(
    (c) => c.inProgress && c.fromNode.id !== id,
  );

  // While drilled, the parent frame is HIDDEN — the same signal ResourceNode
  // uses to swap its flat row for a card; here the row promotes to a full
  // GroupNode card. (Boolean store selector, not useInternalNode — see
  // ResourceNode for why.)
  const parentFrameHidden = useStore((st) =>
    parentId ? !!st.nodeLookup.get(parentId)?.hidden : false,
  );
  const isDrilledChild = isFramed && parentFrameHidden;
  if (isDraft && isDrilledChild) {
    return (
      <GroupNode
        id={id}
        type={"groupNode"}
        position={{ x: 0, y: 0 }}
        data={{
          group,
          enabled: data.enabled,
          showHandles,
          dropTarget: data.dropTarget,
          onClick: () => setSelectedDestinationGroup(group?.id || id),
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        // h-full + centering: the frame layout stamps a fixed slot height on
        // framed rows (deterministic grid — no measure-based re-layout).
        "cc-frame-row relative rounded-lg transition-all group/node w-full h-full flex flex-col justify-center",
        // Draft opens the group panel; live drills into the network (via
        // onNodeClick).
        "cursor-pointer",
      )}
      onClick={() => {
        if (isDraft) setSelectedDestinationGroup(group?.id || id);
      }}
    >
      <div className={"flex items-center gap-2.5 text-nb-gray-300"}>
        <div
          className={cn(
            "cc-frame-row-icon h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 group-hover/node:bg-nb-gray-800 transition-all",
            // Rings live on the icon box, not the whole row: white while a
            // connection drag hovers, sky halo for the context menu.
            isTarget && "group-hover/node:ring-2 group-hover/node:ring-white",
            showHalo && "ring-2 ring-sky-500",
          )}
        >
          <GroupBadgeIcon id={group?.id} issued={group?.issued} size={14} />
        </div>
        <div className={"flex flex-col gap-0 justify-center leading-tight"}>
          <span
            className={
              "font-normal text-[0.85rem] text-nb-gray-100 flex items-center gap-2 mb-1 mt-1 relative top-[0.05rem]"
            }
          >
            <span className={"truncate max-w-[135px]"}>{group?.name}</span>
            {!group?.id && <SmallBadge />}
          </span>
          <span
            className={
              "font-normal text-sm text-nb-gray-500 relative -top-[0.1rem]"
            }
          >
            {group?.resources_count
              ? singularize("Resources", group.resources_count, true)
              : "No Resources"}
          </span>
        </div>
      </div>
      {showHandles && (
        <>
          <AllHandles />
          {isDraft && handlesActive && (
            <ConnectHandle type={"source"} position={Position.Left} />
          )}
        </>
      )}
    </div>
  );
};
