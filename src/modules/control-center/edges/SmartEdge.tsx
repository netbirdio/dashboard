import {
  BaseEdge,
  type EdgeProps,
  getSimpleBezierPath,
  Position,
} from "@xyflow/react";
import { useEdgeNodeRect } from "@/modules/control-center/utils/edge-helper";
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
  // Value-equality subscriptions so unrelated edges don't re-render on drag.
  const sourceRect = useEdgeNodeRect(source);
  const targetRect = useEdgeNodeRect(target);

  if (!sourceRect || !targetRect) return null;

  const enabled = data?.enabled ?? true;
  const bidirectional = data?.policy?.rules?.[0]?.bidirectional ?? false;

  const sPos = sourceRect;
  const tPos = targetRect;
  const sW = sourceRect.width;
  const sH = sourceRect.height;
  const tW = targetRect.width;
  const tH = targetRect.height;

  const sourceIsPolicy = source.startsWith("policy-");
  const targetIsPolicy = target.startsWith("policy-");

  const sCx = sPos.x + sW / 2;
  const tCx = tPos.x + tW / 2;
  const sourceIsLeft = sCx < tCx;

  // Policy nodes have fixed sides: sources enter left, destinations exit right.
  let sx: number, sy: number, tx: number, ty: number;
  let sourcePosition: Position, targetPosition: Position;

  if (sourceIsPolicy) {
    sx = sPos.x + sW;
    sourcePosition = Position.Right;
  } else {
    sx = sourceIsLeft ? sPos.x + sW : sPos.x;
    sourcePosition = sourceIsLeft ? Position.Right : Position.Left;
  }
  sy = sPos.y + sH / 2;

  if (targetIsPolicy) {
    tx = tPos.x;
    targetPosition = Position.Left;
  } else {
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
          className={enabled ? "cc-animated-edge" : undefined}
        />
        <BaseEdge
          id={`${id}-backward`}
          path={backwardPath}
          style={{
            opacity: enabled ? 1 : 0.6,
            strokeWidth: 2,
            stroke: enabled ? "#0e9f6e" : "#787878",
            strokeDasharray: "5, 5",
          }}
          className={enabled ? "cc-animated-edge" : undefined}
        />
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
      className={enabled ? "cc-animated-edge" : undefined}
    />
  );
}
