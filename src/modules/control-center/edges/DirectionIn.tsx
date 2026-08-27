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
          sourceX: sourceX - 10,
          sourceY,
          sourcePosition,
          targetX: targetX + 10,
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
        /* Green is intentionally identical in both themes; the neutral uses
           ramp tokens inline — xyflow's .react-flow__edge-path sets stroke
           and loads after the Tailwind utilities. */
        stroke: enabled
          ? "#0e9f6e"
          : resolvedTheme === "light"
          ? "rgb(var(--nb-gray-700))"
          : "rgb(var(--nb-gray-400))",
        strokeDasharray: "5, 5",
      }}
      className={enabled ? "cc-animated-edge" : undefined}
    />
  );
}
