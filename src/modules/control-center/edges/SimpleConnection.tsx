import { BaseEdge, type EdgeProps, getSimpleBezierPath } from "@xyflow/react";
import React from "react";
import { useTheme } from "@/contexts/ThemeProvider";
import { canvasConnectionStroke } from "@/modules/control-center/utils/canvas-theme";
import { useSourceGroupEnabled } from "@/modules/control-center/utils/helpers";

type Props = {
  data?: {
    enabled?: boolean;
  };
} & EdgeProps;

export function SimpleConnection({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  source,
}: Props) {
  const [edgePath] = getSimpleBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // The edge's own flag wins: some views (users) set enabled on the EDGE while
  // their source node carries none, and the node lookup would default to false.
  const nodeEnabled = useSourceGroupEnabled(source);
  const enabled = data?.enabled ?? nodeEnabled;
  const { resolvedTheme } = useTheme();

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        strokeWidth: 1.5,
        stroke: canvasConnectionStroke(resolvedTheme),
        strokeDasharray: "0, 0",
        opacity: enabled ? 1 : 0.6,
      }}
    ></BaseEdge>
  );
}
