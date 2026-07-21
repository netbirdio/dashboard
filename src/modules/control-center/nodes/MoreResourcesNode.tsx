import { cn } from "@utils/helpers";
import { MoreHorizontal } from "lucide-react";
import * as React from "react";

// The "+N more" cell shown in a network frame's last grid slot when its
// resources overflow the visible cap (NETWORK_FRAME_MAX_VISIBLE). It mirrors a
// draft resource row's anatomy — left-aligned icon box + label — and its box,
// but is NOT a ReactFlow node: NetworkNode overlays it at the rect
// useNetworkFrameLayout computed, so it lines up with the resource child
// nodes. Clicking it bubbles to the frame, which drills into the
// single-network view.
export const MoreResourcesNode = ({
  count,
  style,
}: {
  count: number;
  style?: React.CSSProperties;
}) => {
  return (
    <div
      // Center content vertically in the cell box (whose height matches the
      // sibling resource) so the icon box lines up with the resource rows'
      // icon boxes — those sit centered in a taller two-line row.
      className={
        "absolute flex items-center rounded-lg transition-all group/node cursor-pointer"
      }
      style={style}
    >
      <div className={"flex items-center gap-2.5 text-nb-gray-300"}>
        <div
          className={cn(
            "h-9 w-9 bg-nb-gray-850 group-hover/node:text-nb-gray-200 rounded-md flex items-center justify-center shrink-0 group-hover/node:bg-nb-gray-700 transition-all",
            "border border-nb-gray-850 group-hover/node:border-nb-gray-700",
          )}
        >
          <MoreHorizontal size={16} />
        </div>
        <span
          className={
            "font-normal text-sm text-nb-gray-400 group-hover/node:text-nb-gray-200 transition-all"
          }
        >
          +{count} more
        </span>
      </div>
    </div>
  );
};
