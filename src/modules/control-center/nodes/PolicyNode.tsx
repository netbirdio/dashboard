import { cn } from "@utils/helpers";
import { Handle, type Node, Position, useConnection, useNodeId } from "@xyflow/react";
import * as React from "react";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterPolicy } from "@/modules/control-center/ControlCenterPolicyModals";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";
import { getPolicyProtocolAndPortText } from "@/modules/control-center/utils/helpers";
import { Policy } from "@/interfaces/Policy";

type PolicyNode = Node<
  {
    policy: Policy;
  },
  "policyNode"
>;

export const PolicyNode = ({ data, id }: PolicyNode) => {
  const rule = data.policy.rules?.[0];
  const label = getPolicyProtocolAndPortText(data.policy);
  const isActive = rule?.enabled;
  const { contextMenuNodeId } = useCanvasState();
  const { selectedPolicy, policyModalOpen } = useControlCenterPolicy();
  const { isDraft } = useDraftMode();
  const connection = useConnection();
  const nodeId = useNodeId();
  // A drag from another node may be dropped here (add group to this policy).
  const isDropTarget =
    connection.inProgress && connection.fromNode?.id !== nodeId;
  // Halo while the context menu targets this policy or its modal is open.
  const isEditing = policyModalOpen && `policy-${selectedPolicy}` === id;
  const showHalo = contextMenuNodeId === id || isEditing;

  return (
    <div
      className={cn(
        "relative group/node bg-nb-gray-940 hover:bg-nb-gray-930 hover:border-nb-gray-800 cursor-pointer border border-nb-gray-900 rounded-full flex justify-between transition-all",
        !isActive && "opacity-60",
        isDraft && isDropTarget && "hover:bg-nb-gray-930 hover:ring-2 ring-white",
        showHalo && "ring-2 ring-sky-500",
      )}
    >
      <div className={"flex items-center justify-center"}>
        <div
          className={cn(
            "h-2 w-2 rounded-full ml-3 mr-2",
            isActive ? "bg-green-400" : "bg-nb-gray-400",
          )}
        ></div>
      </div>
      <div className={"pt-2.5 pb-[0.6rem] pr-3 flex gap-4 leading-none"}>
        <div
          className={
            " text-nb-gray-200 font-normal whitespace-nowrap text-[0.8rem] flex items-center justify-center w-full"
          }
        >
          <div className={"truncate max-w-[200px]"}>{rule?.name}</div>
        </div>
      </div>
      <div
        className={
          "border-l border-nb-gray-800 flex items-center text-nb-gray-300 text-[0.65rem] pl-2 pr-3 font-mono"
        }
      >
        <div>{label === "" ? "All" : label}</div>
      </div>

      <Handle type="source" position={Position.Right} id={"sr"} className={"opacity-0"} isConnectable={false} />
      <Handle type="source" position={Position.Left} id={"sl"} className={"opacity-0"} isConnectable={false} />
      <Handle type="source" position={Position.Top} id={"st"} className={"opacity-0"} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} id={"sb"} className={"opacity-0"} isConnectable={false} />
      <Handle type="target" position={Position.Left} id={"tl"} className={"opacity-0"} isConnectable={false} />
      <Handle type="target" position={Position.Right} id={"tr"} className={"opacity-0"} isConnectable={false} />
      <Handle type="target" position={Position.Top} id={"tt"} className={"opacity-0"} isConnectable={false} />
      <Handle type="target" position={Position.Bottom} id={"tb"} className={"opacity-0"} isConnectable={false} />

      {/* Draft: hover connect handles — dragging from the right adds the
          target group as a destination, from the left as a source. The
          full-area target handle accepts drags from group handles (left group
          handle → destination, right → source). */}
      {isDraft && (
        <>
          <ConnectHandle type={"source"} position={Position.Left} />
          <ConnectHandle type={"source"} position={Position.Right} />
          <Handle
            type={"target"}
            position={Position.Left}
            id={"ta"}
            isConnectableStart={false}
            isConnectable={isDropTarget}
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
      )}
    </div>
  );
};
