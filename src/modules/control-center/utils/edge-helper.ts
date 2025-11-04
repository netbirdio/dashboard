import { InternalNode, Node, Position } from "@xyflow/react";

type IntersectionPoint = {
  x: number;
  y: number;
};

function getNodeIntersection(
  intersectionNode: InternalNode<Node>,
  targetNode: InternalNode<Node>,
) {
  const { width: intersectionNodeWidth, height: intersectionNodeHeight } =
    intersectionNode.measured;
  const intersectionNodePosition = intersectionNode.internals.positionAbsolute;
  const targetPosition = targetNode.internals.positionAbsolute;
  const measuredTargetWidth = targetNode.measured.width || 0;
  const measuredTargetHeight = targetNode.measured.height || 0;

  const w = (intersectionNodeWidth || 0) / 2;
  const h = (intersectionNodeHeight || 0) / 2;

  const x2 = intersectionNodePosition.x + w;
  const y2 = intersectionNodePosition.y + h;
  const x1 = targetPosition.x + measuredTargetWidth / 2;
  const y1 = targetPosition.y + measuredTargetHeight / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
}

function getEdgePosition(
  node: InternalNode<Node>,
  intersectionPoint: IntersectionPoint,
) {
  const n = { ...node.internals.positionAbsolute, ...node };
  const nx = Math.round(n.x);
  const ny = Math.round(n.y);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);
  const measuredWidth = n.measured.width || 0;
  const measuredHeight = n.measured.height || 0;

  if (px <= nx + 1) {
    return Position.Left;
  }
  if (px >= nx + measuredWidth - 1) {
    return Position.Right;
  }
  if (py <= ny + 1) {
    return Position.Top;
  }
  if (py >= n.y + measuredHeight - 1) {
    return Position.Bottom;
  }

  return Position.Top;
}

export function getEdgeParams(
  source: InternalNode<Node>,
  target: InternalNode<Node>,
) {
  const sourceIntersectionPoint: IntersectionPoint = getNodeIntersection(
    source,
    target,
  );
  const targetIntersectionPoint: IntersectionPoint = getNodeIntersection(
    target,
    source,
  );

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
}
