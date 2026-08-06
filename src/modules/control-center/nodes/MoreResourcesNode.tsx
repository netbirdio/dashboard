import { cn } from "@utils/helpers";
import { MoreHorizontal } from "lucide-react";
import * as React from "react";

// NOT a ReactFlow node: NetworkNode overlays it at the rect
// useNetworkFrameLayout computed. Clicking bubbles to the frame → drills in.
export const MoreResourcesNode = ({
  count,
  style,
}: {
  count: number;
  style?: React.CSSProperties;
}) => {
  return (
    <div
      // Own hover group (`group/more`, not the frame's `group/node`) so
      // hovering the parent frame doesn't light this cell up.
      className={
        "absolute flex items-center rounded-lg transition-all group/more cursor-pointer"
      }
      style={style}
    >
      <div className={"flex items-center gap-2.5 text-nb-gray-300"}>
        <div
          className={cn(
            "h-9 w-9 bg-nb-gray-850 group-hover/more:text-nb-gray-200 rounded-md flex items-center justify-center shrink-0 group-hover/more:bg-nb-gray-700 transition-all",
            "border border-nb-gray-850 group-hover/more:border-nb-gray-700",
          )}
        >
          <MoreHorizontal size={16} />
        </div>
        <span
          className={
            "font-normal text-sm text-nb-gray-400 group-hover/more:text-nb-gray-200 transition-all"
          }
        >
          +{count} more
        </span>
      </div>
    </div>
  );
};
