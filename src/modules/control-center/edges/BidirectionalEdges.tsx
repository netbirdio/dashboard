import { BaseEdge, type EdgeProps, getSmoothStepPath } from "@xyflow/react";
import React from "react";

export function BidirectionalEdges({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const [forwardPath] = getSmoothStepPath({
    sourceX: sourceX - 5,
    sourceY: sourceY - 5,
    sourcePosition,
    targetX: targetX + 15,
    targetY: targetY - 5,
    targetPosition,
  });

  const [backwardPath] = getSmoothStepPath({
    sourceX: targetX + 5,
    sourceY: targetY + 5,
    sourcePosition: targetPosition,
    targetX: sourceX - 15,
    targetY: sourceY + 5,
    targetPosition: sourcePosition,
  });

  return (
    <>
      <BaseEdge
        id={`${id}-forward`}
        path={forwardPath}
        style={{
          strokeWidth: 2,
          stroke: "#0e9f6e",
          strokeDasharray: "5, 5",
        }}
      >
        <animate
          attributeName="stroke-dashoffset"
          from="20"
          to="0"
          dur="0.5s"
          repeatCount="indefinite"
        />
      </BaseEdge>

      <BaseEdge
        id={`${id}-backward`}
        path={backwardPath}
        style={{
          strokeWidth: 2,
          stroke: "#0e9f6e",
          strokeDasharray: "5, 5",
        }}
      >
        <animate
          attributeName="stroke-dashoffset"
          from="20"
          to="0"
          dur="0.5s"
          repeatCount="indefinite"
        />
      </BaseEdge>
    </>
  );
}
