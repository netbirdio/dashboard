import {
  BaseEdge,
  type EdgeProps,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
} from "@xyflow/react";
import { useTheme } from "@/contexts/ThemeProvider";
import React from "react";

type Props = {
  data: {
    enabled: boolean;
    type: "smoothstep" | "straight" | "bezier";
  };
} & EdgeProps;

export function DirectionIn({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: Props) {
  const { enabled, type = "straight" } = data;
  const { resolvedTheme } = useTheme();

  const getPath = () => {
    switch (type) {
      case "straight":
        return getStraightPath({
          sourceX,
          sourceY,
          targetX,
          targetY,
        });
      case "bezier":
        return getSimpleBezierPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
        });
      case "smoothstep":
        return getSmoothStepPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
        });
      default:
        return getSmoothStepPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
        });
    }
  };

  const [edgePath] = getPath();

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        opacity: enabled ? 1 : 0.6,
        strokeWidth: 2,
        stroke: enabled
          ? "#0e9f6e"
          : resolvedTheme === "light"
            ? "#b7c0c6"
            : "#787878",
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
