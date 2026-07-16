import { Handle, Position } from "@xyflow/react";
import * as React from "react";

// Invisible target handle spanning the whole node — a connection dragged
// from another node can be dropped anywhere on it. Connectable only while a
// drag is in progress (pass the node's isTarget), so it never swallows
// regular pointer interactions.
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
