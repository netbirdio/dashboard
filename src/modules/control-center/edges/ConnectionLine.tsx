import {
  ConnectionLineComponentProps,
  getSimpleBezierPath,
  useConnection,
} from "@xyflow/react";
import * as React from "react";

export const ConnectionLine = ({
  fromX,
  fromY,
  toX,
  toY,
}: ConnectionLineComponentProps) => {
  const { fromHandle, toHandle } = useConnection();

  const [edgePath] = getSimpleBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromHandle?.position,
    targetX: toX,
    targetY: toY,
    targetPosition: toHandle?.position,
  });

  return (
    fromHandle?.id && (
      <g style={{ pointerEvents: "none" }}>
        <path
          fill="none"
          strokeWidth={2}
          strokeDasharray="5, 5"
          style={{ opacity: 0.6 }}
          className="cc-animated-edge stroke-nb-gray-50"
          d={edgePath}
        />
      </g>
    )
  );
};
