import { Handle, Position } from "@xyflow/react";
import * as React from "react";

// Invisible target handle spanning the whole node so a dragged connection can
// drop anywhere on it. Connectable only mid-drag, to not swallow clicks.
export const FullAreaTargetHandle = ({
  isConnectable,
  id = "ta",
}: {
  isConnectable: boolean;
  id?: string;
}) => (
  <Handle
    type={"target"}
    position={Position.Left}
    id={id}
    isConnectableStart={false}
    isConnectable={isConnectable}
    style={{
      background: "none",
      border: "none",
      borderRadius: "0",
      position: "absolute",
      width: "100%",
      height: "100%",
      left: "0",
      top: 0,
      transform: "none",
    }}
  />
);
