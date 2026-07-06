import { Handle, Position, useConnection, useNodeId } from "@xyflow/react";
import * as React from "react";

export const AllHandles = () => {
  const connection = useConnection();
  const nodeId = useNodeId();
  const isTarget = connection.inProgress && connection.fromNode.id !== nodeId;

  return (
    <>
      <Handle
        type={"source"}
        position={Position.Left}
        id={"sl"}
        className={"opacity-0"}
      />
      <Handle
        type={"source"}
        position={Position.Right}
        id={"sr"}
        className={"opacity-0"}
      />

      <Handle
        type={"target"}
        position={Position.Left}
        isConnectableStart={false}
        isConnectable={isTarget}
        id={"tl"}
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
    </>
  );
};
