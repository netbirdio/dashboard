import { Handle, Position, useConnection, useNodeId } from "@xyflow/react";
import * as React from "react";
import { FullAreaTargetHandle } from "@/modules/control-center/handles/FullAreaTargetHandle";

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

      <FullAreaTargetHandle isConnectable={isTarget} id={"tl"} />
    </>
  );
};
