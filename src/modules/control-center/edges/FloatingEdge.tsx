import {
  BaseEdge,
  EdgeProps,
  getBezierPath,
  useInternalNode,
} from "@xyflow/react";
import React from "react";
import { getEdgeParams } from "@/modules/control-center/utils/edge-helper";

function FloatingEdge({ id, source, target, markerEnd, style }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode,
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
    >
      <animate
        attributeName="stroke-dashoffset"
        from="20"
        to="0"
        dur="0.5s"
        repeatCount="indefinite"
      />
    </BaseEdge>
  );
}

export default FloatingEdge;
