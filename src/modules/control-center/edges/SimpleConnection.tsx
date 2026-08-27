import { BaseEdge, type EdgeProps, getSimpleBezierPath } from "@xyflow/react";
import { useTheme } from "@/contexts/ThemeProvider";
import React from "react";
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
        stroke: resolvedTheme === "light" ? "#b7c0c6" : "#7d7d7d",
        strokeDasharray: "0, 0",
        opacity: enabled ? 1 : 0.6,
      }}
    ></BaseEdge>
  );
}
