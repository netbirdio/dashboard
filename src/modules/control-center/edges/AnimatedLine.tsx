import { Edge, getSimpleBezierPath, Position } from "@xyflow/react";
import React from "react";
import { useEdgeNodeRect } from "@/modules/control-center/utils/edge-helper";

type AnimatedLineProps = Edge<
  {
    label?: string;
    color?: string;
  },
  "animated-line"
>;

function AnimatedLine({ source, target, data }: AnimatedLineProps) {
  const sourceRect = useEdgeNodeRect(source);
  const targetRect = useEdgeNodeRect(target);
  if (!sourceRect || !targetRect) return null;

  const color = data?.color || "#0e9f6e";
  const label = data?.label || "";
  const hasLabel = label.length > 0;
  const fontSize = 12;
  const labelWidth = label.length * 7 + 12;
  const labelHeight = fontSize + 6;

  // Anchor each end to the side facing the other.
  const sourceIsLeft =
    sourceRect.x + sourceRect.width / 2 < targetRect.x + targetRect.width / 2;
  const sx = sourceIsLeft ? sourceRect.x + sourceRect.width : sourceRect.x;
  const sy = sourceRect.y + sourceRect.height / 2;
  const tx = sourceIsLeft ? targetRect.x : targetRect.x + targetRect.width;
  const ty = targetRect.y + targetRect.height / 2;

  const [path, labelX, labelY] = getSimpleBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourceIsLeft ? Position.Right : Position.Left,
    targetX: tx,
    targetY: ty,
    targetPosition: sourceIsLeft ? Position.Left : Position.Right,
  });

  return (
    <>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray="5, 5"
        className="cc-animated-edge"
      />
      {hasLabel && (
        <foreignObject
          x={labelX - labelWidth / 2}
          y={labelY - labelHeight / 2}
          width={labelWidth}
          height={labelHeight}
          style={{ overflow: "visible" }}
        >
          <div
            style={{
              width: labelWidth,
              height: labelHeight,
              fontSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
              background: "#181a1d",
              borderRadius: 4,
            }}
            className={
              "flex items-center justify-center gap-1 select-none pointer-events-none z-10 text-green-50"
            }
          >
            <div className={"whitespace-nowrap"}>{label}</div>
          </div>
        </foreignObject>
      )}
    </>
  );
}

export default AnimatedLine;
