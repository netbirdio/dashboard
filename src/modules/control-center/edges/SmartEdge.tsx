import {
  BaseEdge,
  type EdgeProps,
  getSimpleBezierPath,
  Position,
  useInternalNode,
} from "@xyflow/react";
import React from "react";
import type { Policy } from "@/interfaces/Policy";

type Props = {
  data?: {
    enabled?: boolean;
    policy?: Policy;
  };
} & EdgeProps;

const OFFSET = 4;

export function SmartEdge({ id, source, target, data }: Props) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const enabled = data?.enabled ?? true;
  const bidirectional = data?.policy?.rules?.[0]?.bidirectional ?? false;

  const sPos = sourceNode.internals.positionAbsolute;
  const tPos = targetNode.internals.positionAbsolute;
  const sW = sourceNode.measured.width ?? 0;
  const sH = sourceNode.measured.height ?? 0;
  const tW = targetNode.measured.width ?? 0;
  const tH = targetNode.measured.height ?? 0;

  const sourceIsPolicy = source.startsWith("policy-");
  const targetIsPolicy = target.startsWith("policy-");

  const sCx = sPos.x + sW / 2;
  const tCx = tPos.x + tW / 2;
  const sourceIsLeft = sCx < tCx;

  // Policy nodes have fixed sides: sources enter left, destinations exit right
  let sx: number, sy: number, tx: number, ty: number;
  let sourcePosition: Position, targetPosition: Position;

  if (sourceIsPolicy) {
    // Source is policy → always exits from right
    sx = sPos.x + sW;
    sourcePosition = Position.Right;
  } else {
    // Non-policy source → pick side based on relative position
    sx = sourceIsLeft ? sPos.x + sW : sPos.x;
    sourcePosition = sourceIsLeft ? Position.Right : Position.Left;
  }
  sy = sPos.y + sH / 2;

  if (targetIsPolicy) {
    // Target is policy → always enters from left
    tx = tPos.x;
    targetPosition = Position.Left;
  } else {
    // Non-policy target → pick side based on relative position
    tx = sourceIsLeft ? tPos.x : tPos.x + tW;
    targetPosition = sourceIsLeft ? Position.Left : Position.Right;
  }
  ty = tPos.y + tH / 2;

  if (bidirectional) {
    const [forwardPath] = getSimpleBezierPath({
      sourceX: sx,
      sourceY: sy - OFFSET,
      sourcePosition,
      targetX: tx,
      targetY: ty - OFFSET,
      targetPosition,
    });

    const [backwardPath] = getSimpleBezierPath({
      sourceX: tx,
      sourceY: ty + OFFSET,
      sourcePosition: targetPosition,
      targetX: sx,
      targetY: sy + OFFSET,
      targetPosition: sourcePosition,
    });

    return (
      <>
        <BaseEdge
          id={`${id}-forward`}
          path={forwardPath}
          style={{
            opacity: enabled ? 1 : 0.6,
            strokeWidth: 2,
            stroke: enabled ? "#0e9f6e" : "#787878",
            strokeDasharray: "5, 5",
          }}
        >
          {enabled && (
            <animate
              attributeName="stroke-dashoffset"
              from="20"
              to="0"
              dur="0.5s"
              repeatCount="indefinite"
            />
          )}
        </BaseEdge>
        <BaseEdge
          id={`${id}-backward`}
          path={backwardPath}
          style={{
            opacity: enabled ? 1 : 0.6,
            strokeWidth: 2,
            stroke: enabled ? "#0e9f6e" : "#787878",
            strokeDasharray: "5, 5",
          }}
        >
          {enabled && (
            <animate
              attributeName="stroke-dashoffset"
              from="20"
              to="0"
              dur="0.5s"
              repeatCount="indefinite"
            />
          )}
        </BaseEdge>
      </>
    );
  }

  const [edgePath] = getSimpleBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition,
    targetX: tx,
    targetY: ty,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        opacity: enabled ? 1 : 0.6,
        strokeWidth: 2,
        stroke: enabled ? "#0ea5e9" : "#787878",
        strokeDasharray: "5, 5",
      }}
    >
      {enabled && (
        <animate
          attributeName="stroke-dashoffset"
          from="20"
          to="0"
          dur="0.5s"
          repeatCount="indefinite"
        />
      )}
    </BaseEdge>
  );
}
