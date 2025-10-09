import { Edge, useInternalNode } from "@xyflow/react";
import React from "react";
import { getEdgeParams } from "@/modules/control-center/utils/edge-helper";

type AnimatedLineProps = Edge<
  {
    label?: string;
    color?: string;
  },
  "animated-line"
>;

function AnimatedLine({ id, source, target, data }: AnimatedLineProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode) return null;

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  const labelX = (sx + tx) / 2;
  const labelY = (sy + ty) / 2;

  let angle = Math.atan2(ty - sy, tx - sx) * (180 / Math.PI);
  if (angle < -90 || angle > 90) {
    angle += 180;
  }

  const label = data?.label || "";
  const hasLabel = label?.length > 0;
  const fontSize = 12;
  const paddingX = hasLabel ? 2 : 0;
  const paddingY = hasLabel ? 2 : 0;

  const gapWidth = hasLabel ? 4 : 0;
  const labelTextWidth = label.length * 7;

  const labelWidth = gapWidth + labelTextWidth + paddingX * 2;
  const labelHeight = fontSize + paddingY * 2;

  const dx = tx - sx;
  const dy = ty - sy;
  const length = Math.sqrt(dx * dx + dy * dy);
  const gap = labelWidth / 2;
  const nx = dx / length;
  const ny = dy / length;

  const preLabelX = labelX - nx * gap;
  const preLabelY = labelY - ny * gap;

  const postLabelX = labelX + nx * gap;
  const postLabelY = labelY + ny * gap;

  const color = data?.color || "#0e9f6e";

  return (
    <>
      <line
        x1={sx}
        y1={sy}
        x2={preLabelX}
        y2={preLabelY}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="5, 5"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="20"
          to="0"
          dur="0.5s"
          repeatCount="indefinite"
        />
      </line>
      <line
        x1={postLabelX}
        y1={postLabelY}
        x2={tx}
        y2={ty}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="5, 5"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="20"
          to="0"
          dur="0.5s"
          repeatCount="indefinite"
        />
      </line>
      {label && hasLabel && (
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
              padding: `${paddingY}px ${paddingX}px`,
              transform: `rotate(${angle}deg)`,
              transformOrigin: "center center",
              boxSizing: "border-box",
              background: "none",
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
