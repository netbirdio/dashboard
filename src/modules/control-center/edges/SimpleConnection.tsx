import { BaseEdge, type EdgeProps, getSimpleBezierPath } from "@xyflow/react";
import React from "react";
import { useSourceGroupEnabled } from "@/modules/control-center/utils/helpers";

type Props = {
  data: {
    enabled: boolean;
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

  const enabled = useSourceGroupEnabled(source);

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        strokeWidth: 1.5,
        stroke: "#595959",
        strokeDasharray: "0, 0",
        opacity: enabled ? 1 : 0.6,
      }}
    ></BaseEdge>
  );
}
