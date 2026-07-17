import { cn } from "@utils/helpers";
import { type Node } from "@xyflow/react";
import { PlusIcon } from "lucide-react";
import * as React from "react";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

type AddNetworkResourceNode = Node<
  Record<string, never>,
  "addNetworkResourceNode"
>;

// The "Add Resource" row INSIDE a network frame — created/removed by
// useNetworkFrameLayout (present while the frame has >= 1 resource, always
// laid out as the last row). Clicking opens the resource editor in
// create-mode; the resource node lands in the frame on save.
export const AddNetworkResourceNode = ({
  parentId,
}: AddNetworkResourceNode) => {
  const { setResourceEditor, hoveredNetworkNodeId } = useDraftMode();
  const isFrameHovered = !!parentId && hoveredNetworkNodeId === parentId;

  return (
    <div
      onClick={() =>
        parentId && setResourceEditor({ createInNetworkNodeId: parentId })
      }
      className={
        "relative rounded-lg transition-all group/node w-full cursor-pointer py-1"
      }
    >
      <div
        className={
          "flex items-center gap-2.5 text-nb-gray-400 group-hover/node:text-nb-gray-200 transition-all"
        }
      >
        <div
          className={cn(
            "h-9 w-9 rounded-md flex items-center justify-center shrink-0 transition-all",
            "border border-dashed border-nb-gray-700",
            "group-hover/node:border-nb-gray-500 group-hover/node:bg-nb-gray-800",
            isFrameHovered && "border-nb-gray-600",
          )}
        >
          <PlusIcon size={16} />
        </div>
        <span className={"font-normal text-[0.85rem]"}>Add Resource</span>
      </div>
    </div>
  );
};
