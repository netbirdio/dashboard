import { BaseEdge, EdgeProps, getBezierPath } from "@xyflow/react";
import React from "react";
import {
  getEdgeParams,
  rectAsInternalNode,
  useEdgeNodeRect,
} from "@/modules/control-center/utils/edge-helper";

function FloatingEdge({ id, source, target, markerEnd, style }: EdgeProps) {
  const sourceRect = useEdgeNodeRect(source);
  const targetRect = useEdgeNodeRect(target);

  if (!sourceRect || !targetRect) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    rectAsInternalNode(sourceRect),
    rectAsInternalNode(targetRect),
  );

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
    targetX: tx,
    targetY: ty,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        strokeWidth: 2,
        stroke: "#0e9f6e",
        strokeDasharray: "5, 5",
      }}
      className={"cc-animated-edge"}
    />
  );
}

export default FloatingEdge;
