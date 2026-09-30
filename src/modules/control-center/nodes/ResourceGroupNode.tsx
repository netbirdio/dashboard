import { SmallBadge } from "@components/ui/SmallBadge";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { cn, singularize } from "@utils/helpers";
import { type Node, Position, useConnection, useStore } from "@xyflow/react";
import * as React from "react";
import { Group } from "@/interfaces/Group";
import {
  useDestinationGroup,
  useIsContextMenuTarget,
} from "@/modules/control-center/contexts/ControlCenterContext";
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

// A resource group shown INSIDE a network frame: a flat row (no card
// background), laid out by the frame like its resources.
export const ResourceGroupNode = ({ data, id, parentId }: ResourceGroupNode) => {
  const { group, showHandles = true } = data;
  const { isDraft, drillDownNetworkNodeId } = useDraftMode();
  const { selectedDestinationGroup, setSelectedDestinationGroup } =
    useDestinationGroup();
  const isContextTarget = useIsContextMenuTarget(id);
  // Panel selection is keyed by group id, or by node id for draft groups.
  const isPanelActive =
    selectedDestinationGroup !== "" &&
    (selectedDestinationGroup === group?.id || selectedDestinationGroup === id);
  const showHalo = isPanelActive || isContextTarget;
  // Framed rows accept drops in every view; dragging FROM one is
  // drill-down-only.
  const isFramed = !!parentId?.startsWith("network-");
  const handlesActive = !isFramed || drillDownNetworkNodeId === parentId;
  const isTarget = useConnection(
    (c) => c.inProgress && c.fromNode.id !== id,
  );

  // While drilled the parent frame is HIDDEN and the row promotes to a full
  // GroupNode card. Boolean store selector on purpose, not useInternalNode.
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
        // The frame layout stamps a fixed slot height on framed rows.
        "cc-frame-row relative rounded-lg transition-all group/node w-full h-full flex flex-col justify-center",
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
            // Rings live on the icon box, not the whole row.
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
      {/* AllHandles always render: even a showHandles-false row has to anchor
          edges. showHandles only gates the visible connect bubble. */}
      <AllHandles />
      {showHandles && isDraft && handlesActive && (
        <ConnectHandle type={"source"} position={Position.Left} />
      )}
    </div>
  );
};
